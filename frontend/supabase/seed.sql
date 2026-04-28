-- =====================================================================
-- MedStock — Seed default users
-- Run this AFTER schema.sql in: Supabase Dashboard → SQL Editor → New Query
-- Idempotent: safe to run multiple times.
--
-- Creates:
--   admin@medstock.local    / admin123    (role: admin)
--   employee@medstock.local / employee123 (role: employee)
--
-- Login in the app with:
--   Username: admin     Password: admin123
--   Username: employee  Password: employee123
-- =====================================================================

do $$
declare
  v_admin_id    uuid;
  v_employee_id uuid;
begin
  -- ---------- ADMIN ----------
  if not exists (select 1 from auth.users where email = 'admin@medstock.local') then
    v_admin_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_admin_id,
      'authenticated', 'authenticated',
      'admin@medstock.local',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"admin","name":"Administrator"}'::jsonb,
      now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_admin_id,
      jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@medstock.local'),
      'email', 'admin@medstock.local',
      now(), now(), now()
    );
  end if;

  -- ---------- EMPLOYEE ----------
  if not exists (select 1 from auth.users where email = 'employee@medstock.local') then
    v_employee_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_employee_id,
      'authenticated', 'authenticated',
      'employee@medstock.local',
      crypt('employee123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"employee","name":"Employee","role":"employee"}'::jsonb,
      now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_employee_id,
      jsonb_build_object('sub', v_employee_id::text, 'email', 'employee@medstock.local'),
      'email', 'employee@medstock.local',
      now(), now(), now()
    );
  end if;

  -- Ensure admin profile actually has admin role (in case trigger ran when profiles wasn't empty)
  update public.profiles
     set role = 'admin'
   where id = (select id from auth.users where email = 'admin@medstock.local')
     and role <> 'admin';

  -- Ensure employee profile has employee role
  update public.profiles
     set role = 'employee'
   where id = (select id from auth.users where email = 'employee@medstock.local')
     and role <> 'employee';
end $$;

-- Verify
select p.username, p.name, p.role, u.email
  from public.profiles p
  join auth.users u on u.id = p.id
 order by p.role, p.username;
