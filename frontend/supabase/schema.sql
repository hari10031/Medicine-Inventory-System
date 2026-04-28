-- =====================================================================
-- MedStock — Medicine Inventory Management System
-- Supabase Postgres schema (tables, RLS, triggers, RPCs)
-- Run this once in: Supabase Dashboard → SQL Editor → New Query
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'employee');
  end if;
end $$;

-- ---------- Tables ----------

-- Profile table is 1:1 with auth.users; holds username + role.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  name        text,
  role        public.user_role not null default 'employee',
  created_at  timestamptz not null default now()
);

create table if not exists public.medicines (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  batch_no            text not null,
  manufacturing_date  date not null,
  expiry_date         date not null,
  quantity            int  not null check (quantity >= 0),
  remaining_quantity  int  not null check (remaining_quantity >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (name, batch_no),
  check (expiry_date > manufacturing_date)
);

create index if not exists idx_medicines_name_lower on public.medicines (lower(name));
create index if not exists idx_medicines_expiry     on public.medicines (expiry_date);

create table if not exists public.transactions (
  id              uuid primary key default gen_random_uuid(),
  medicine_id     uuid references public.medicines(id) on delete set null,
  medicine_name   text not null,
  batch_no        text not null,
  quantity_sold   int  not null check (quantity_sold > 0),
  customer_name   text not null,
  customer_phone  text,
  reason          text,
  handled_by      uuid references auth.users(id) on delete set null,
  handled_by_name text,
  date            timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists idx_tx_date        on public.transactions (date desc);
create index if not exists idx_tx_handled_by  on public.transactions (handled_by);

-- ---------- Helpers ----------

-- Returns role of the currently-authenticated user (or null).
create or replace function public.current_user_role()
returns public.user_role
language sql security definer stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Auto-update medicines.updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_medicines_updated_at on public.medicines;
create trigger trg_medicines_updated_at
  before update on public.medicines
  for each row execute function public.touch_updated_at();

-- ---------- New-user trigger ----------
-- When a row is inserted into auth.users, create a matching profile row.
-- Username/name/role are read from raw_user_meta_data (set during signUp).
-- The very first user to sign up automatically becomes admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
as $$
declare
  v_username text;
  v_name     text;
  v_role     public.user_role;
  v_count    int;
begin
  v_username := coalesce(new.raw_user_meta_data->>'username',
                         split_part(new.email, '@', 1));
  v_name     := new.raw_user_meta_data->>'name';

  select count(*) into v_count from public.profiles;
  if v_count = 0 then
    v_role := 'admin';
  else
    v_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'employee');
  end if;

  insert into public.profiles (id, username, name, role)
  values (new.id, v_username, v_name, v_role)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Row-Level Security
-- =====================================================================
alter table public.profiles     enable row level security;
alter table public.medicines    enable row level security;
alter table public.transactions enable row level security;

-- profiles: any authenticated user can read all profiles
drop policy if exists profiles_select_auth on public.profiles;
create policy profiles_select_auth on public.profiles
  for select to authenticated using (true);

-- profiles: users can update their own profile (limited)
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- profiles: only admins can delete
drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles
  for delete to authenticated
  using (public.current_user_role() = 'admin');

-- medicines: read for all authenticated
drop policy if exists medicines_select_auth on public.medicines;
create policy medicines_select_auth on public.medicines
  for select to authenticated using (true);

-- medicines: write only for admins
drop policy if exists medicines_admin_insert on public.medicines;
create policy medicines_admin_insert on public.medicines
  for insert to authenticated
  with check (public.current_user_role() = 'admin');

drop policy if exists medicines_admin_update on public.medicines;
create policy medicines_admin_update on public.medicines
  for update to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists medicines_admin_delete on public.medicines;
create policy medicines_admin_delete on public.medicines
  for delete to authenticated
  using (public.current_user_role() = 'admin');

-- transactions: admins see all, employees see their own
drop policy if exists transactions_select_role on public.transactions;
create policy transactions_select_role on public.transactions
  for select to authenticated
  using (public.current_user_role() = 'admin' or handled_by = auth.uid());

-- transactions: any authenticated user can insert; must record self as handler
drop policy if exists transactions_insert_self on public.transactions;
create policy transactions_insert_self on public.transactions
  for insert to authenticated
  with check (handled_by = auth.uid());

-- =====================================================================
-- RPCs
-- =====================================================================

-- Atomic dispense: validate, decrement stock, log transaction.
create or replace function public.dispense_medicine(
  p_medicine_id    uuid,
  p_qty            int,
  p_customer_name  text,
  p_customer_phone text default null,
  p_reason         text default null
) returns json
language plpgsql security definer
as $$
declare
  med   public.medicines%rowtype;
  tx    public.transactions%rowtype;
  uname text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantity must be positive';
  end if;
  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'Recipient name is required';
  end if;

  select * into med from public.medicines where id = p_medicine_id for update;
  if not found then
    raise exception 'Medicine not found';
  end if;
  if med.expiry_date < current_date then
    raise exception 'Medicine has expired';
  end if;
  if med.remaining_quantity < p_qty then
    raise exception 'Insufficient stock. Remaining: %', med.remaining_quantity;
  end if;

  update public.medicines
     set remaining_quantity = remaining_quantity - p_qty,
         updated_at = now()
   where id = p_medicine_id
   returning * into med;

  select coalesce(name, username) into uname
    from public.profiles where id = auth.uid();

  insert into public.transactions (
    medicine_id, medicine_name, batch_no, quantity_sold,
    customer_name, customer_phone, reason,
    handled_by, handled_by_name
  ) values (
    med.id, med.name, med.batch_no, p_qty,
    btrim(p_customer_name),
    nullif(btrim(coalesce(p_customer_phone, '')), ''),
    nullif(btrim(coalesce(p_reason, '')), ''),
    auth.uid(), uname
  ) returning * into tx;

  return json_build_object('medicine', row_to_json(med), 'transaction', row_to_json(tx));
end $$;

grant execute on function public.dispense_medicine(uuid,int,text,text,text) to authenticated;

-- Daily dispensing trend for the last N days.
create or replace function public.sales_trend(p_days int default 14)
returns table (label date, units bigint, tx_count bigint)
language sql security definer stable
as $$
  select date_trunc('day', date)::date as label,
         coalesce(sum(quantity_sold), 0)::bigint as units,
         count(*)::bigint as tx_count
    from public.transactions
   where date >= now() - (p_days || ' days')::interval
   group by 1
   order by 1
$$;

grant execute on function public.sales_trend(int) to authenticated;

-- Top medicines by units dispensed.
create or replace function public.top_medicines(p_limit int default 5)
returns table (name text, units bigint)
language sql security definer stable
as $$
  select medicine_name as name, sum(quantity_sold)::bigint as units
    from public.transactions
   group by medicine_name
   order by units desc
   limit p_limit
$$;

grant execute on function public.top_medicines(int) to authenticated;
