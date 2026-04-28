# MedStock — Medicine Inventory Management System

A serverless medicine inventory management app built on Supabase (Postgres + Auth + RLS) with a React frontend. Role-based access (Admin / Employee), bulk Excel upload, dispensing workflow, and an analytics dashboard with charts.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router, Zustand, Recharts, Lucide Icons, react-hot-toast, xlsx
- **Backend:** Supabase (no custom server) — Postgres + Auth + Row-Level Security + Postgres functions (RPC)
- **Database:** Supabase Postgres

## Features

- **Auth:** Username + password (mapped to a synthetic `<user>@medstock.local` email under the hood). The first user to sign up automatically becomes admin.
- **Roles:** Admin can manage medicines, users, and view analytics. Employees can dispense medicine and view their own transactions.
- **Inventory:** add / edit / delete / list with sort & filter; auto-tracked remaining quantity, expiry alerts, low-stock alerts.
- **Bulk upload** via `.xlsx` / `.csv` parsed entirely client-side; preview with per-row validation before saving.
- **Dispense flow** captures recipient name, phone and reason; atomic stock decrement via Postgres function (RPC); refuses expired or out-of-stock items.
- **Admin analytics dashboard:** total medicines, low stock, expiring soon, dispensing trend (last 14 days), top medicines, stock distribution.
- **RLS-enforced security:** all access rules are in the database, not the client. Even a malicious client can't escape role boundaries.
- Dark / light mode, responsive sidebar layout, toast notifications.

## Project Structure

```
project d1/
└── frontend/
    ├── supabase/
    │   └── schema.sql     # Run once in Supabase SQL Editor
    ├── src/
    │   ├── components/    # Layout (sidebar, header)
    │   ├── pages/         # Login, Dashboard, Inventory, AddMedicine, BulkUpload, Dispense, Transactions, Users
    │   ├── lib/           # supabase client, row mappers, formatters
    │   ├── store/         # Zustand auth store (Supabase session)
    │   └── App.jsx
    ├── .env.example
    ├── vercel.json
    └── package.json
```

The entire app lives under `frontend/` so Vercel (or any static host) can deploy from a single root.

## Setup

### 1. Create a Supabase project

1. Go to <https://supabase.com>, create a project (free tier is fine).
2. Open **SQL Editor → New Query**, paste the contents of `frontend/supabase/schema.sql`, and run it. This creates tables, enables RLS, sets up a trigger that auto-creates a `profiles` row for each new auth user, and registers RPC functions (`dispense_medicine`, `sales_trend`, `top_medicines`).
3. Open **Authentication → Providers → Email** and **disable "Confirm email"** (otherwise users can't sign in to local-domain `@medstock.local` addresses).
4. Open **Project Settings → API** and copy:
   - `Project URL`     → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 2. Run the frontend

```bash
cd frontend
npm install
copy .env.example .env      # Windows
# or: cp .env.example .env  # macOS/Linux
# edit .env and paste the values from step 1.4

npm run dev                 # App on http://localhost:5173
```

### 3. Bootstrap the first admin

Visit `http://localhost:5173`, click the **Sign Up** tab, choose any username & password.
The first profile created in the database is automatically promoted to **admin** by the trigger.
After that, additional users can be created through the **Users** page (admin only) or by signing up (default role: employee).

## Bulk Upload Format

Upload an `.xlsx` or `.csv` file with the following columns (case-insensitive, spaces/underscores ignored):

| Column              | Required | Notes                          |
| ------------------- | -------- | ------------------------------ |
| `name`              | yes      | Medicine name                  |
| `batchNo`           | yes      | Batch number                   |
| `manufacturingDate` | yes      | Date (YYYY-MM-DD or Excel date)|
| `expiryDate`        | yes      | Must be after manufacturing    |
| `quantity`          | yes      | Integer                        |

The uploader shows a preview with per-row validation before saving. Duplicates (same name + batch) are skipped via Postgres upsert.

## Database Schema (high level)

| Table          | Purpose                                                          |
| -------------- | ---------------------------------------------------------------- |
| `profiles`     | 1:1 with `auth.users`; stores `username`, `name`, `role`         |
| `medicines`    | Catalog of medicines with quantity tracking                      |
| `transactions` | Every dispense; stores recipient name, phone, reason             |

### RLS policies

- `profiles`: any authenticated user can read all profiles; users can update only their own row.
- `medicines`: any authenticated user can read; only admins can insert/update/delete.
- `transactions`: admins read all; employees read only their own. All authenticated users can insert, but `handled_by` must equal `auth.uid()`.

### RPC functions

| Function                                                | Purpose                                               |
| ------------------------------------------------------- | ----------------------------------------------------- |
| `dispense_medicine(medicine_id, qty, name, phone, reason)` | Atomic stock decrement + transaction insert (with row-level lock) |
| `sales_trend(days)`                                     | Daily aggregated dispense totals for the dashboard    |
| `top_medicines(limit)`                                  | Most-dispensed medicines                              |

## Deployment

### Frontend (Vercel)
1. Import the repo into Vercel.
2. Set **Root Directory** to `frontend`.
3. Add env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy. The included `vercel.json` handles SPA route rewrites.

### Backend
There is no backend server to deploy — Supabase hosts everything (Postgres, Auth, RLS, RPC). Just keep the project running on Supabase.

## Notes

- Tailwind directives (`@tailwind`, `@apply`) may show editor warnings in `frontend/src/index.css`. They are valid and processed by PostCSS at build time.
- The `anon` key is safe to expose in the frontend bundle — RLS policies enforce all security in the database.
- If you need email verification or password reset flows, switch the auth model from synthetic emails to real ones and keep `Confirm email` enabled.
