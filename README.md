# MedStock — Medicine Inventory Management System

A modern full-stack MERN application for managing medicine stock with role-based access (Admin / Employee), bulk Excel upload, dispensing workflow, and an analytics dashboard with charts.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router, Zustand, Recharts, Axios, Lucide Icons, react-hot-toast
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT auth, bcryptjs, Multer, xlsx
- **Database:** MongoDB

## Features

- Role-based authentication (Admin / Employee) using JWT, bcrypt-hashed passwords
- Medicine inventory: add / edit / delete / list with sort & filter
- Auto-tracked `remainingQuantity`, expiry alerts, low-stock alerts
- Bulk upload via `.xlsx` / `.csv` with preview & validation
- Manual entry form with validation
- Dispense module with stock-prevention checks and transaction logs
- Admin analytics dashboard: total medicines, low stock, expiring soon, sales trend, top medicines, stock distribution
- Search & filter by name, batch, expiry; sort by quantity / expiry
- Dark / light mode, responsive sidebar layout, toast notifications

## Project Structure

```
project d1/
├── backend/
│   ├── src/
│   │   ├── models/        # Mongoose schemas (User, Medicine, Transaction)
│   │   ├── routes/        # auth, medicines, transactions, analytics
│   │   ├── middleware/    # auth & role guards
│   │   ├── seed.js        # seed admin/employee + sample medicines
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/    # Layout (sidebar, header)
    │   ├── pages/         # Login, Dashboard, Inventory, AddMedicine, BulkUpload, Dispense, Transactions, Users
    │   ├── lib/           # api client, formatters
    │   ├── store/         # Zustand auth store
    │   └── App.jsx
    └── package.json
```

## Setup

### 1. Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or a connection URI

### 2. Backend

```bash
cd backend
npm install
copy .env.example .env      # Windows
# or: cp .env.example .env  # macOS/Linux
# edit .env and set JWT_SECRET, MONGO_URI

npm run seed                # creates admin/admin123 and employee/employee123 + sample medicines
npm run dev                 # API on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # App on http://localhost:5173
```

The Vite dev server proxies `/api` calls to the backend at `:5000`.

## Demo Credentials (after seeding)

- **Admin:** `admin` / `admin123`
- **Employee:** `employee` / `employee123`

## Bulk Upload Format

Upload an `.xlsx` or `.csv` file with the following columns (case-insensitive, spaces/underscores ignored):

| Column              | Required | Notes                          |
| ------------------- | -------- | ------------------------------ |
| `name`              | yes      | Medicine name                  |
| `batchNo`           | yes      | Batch number                   |
| `manufacturingDate` | yes      | Date (YYYY-MM-DD or Excel date)|
| `expiryDate`        | yes      | Must be after manufacturing    |
| `quantity`          | yes      | Integer                        |

The uploader shows a preview with per-row validation before saving.

## API Overview

| Method | Path                              | Role            | Purpose                       |
| ------ | --------------------------------- | --------------- | ----------------------------- |
| POST   | `/api/auth/login`                 | public          | Login, returns JWT            |
| POST   | `/api/auth/register`              | admin           | Create user                   |
| GET    | `/api/auth/me`                    | auth            | Current user                  |
| GET    | `/api/medicines`                  | auth            | List with filters/sort        |
| POST   | `/api/medicines`                  | admin           | Create                        |
| PUT    | `/api/medicines/:id`              | admin           | Update                        |
| DELETE | `/api/medicines/:id`              | admin           | Delete                        |
| POST   | `/api/medicines/bulk/preview`     | admin           | Parse & validate file         |
| POST   | `/api/medicines/bulk/save`        | admin           | Insert valid rows             |
| POST   | `/api/transactions/dispense`      | auth            | Dispense / sell                |
| GET    | `/api/transactions`               | auth            | List logs (employees see own)  |
| GET    | `/api/analytics/summary`          | admin           | KPI counts                     |
| GET    | `/api/analytics/sales-trend`      | admin           | Daily/weekly/monthly trend     |
| GET    | `/api/analytics/top-medicines`    | admin           | Most-used medicines            |
| GET    | `/api/analytics/stock-distribution` | admin         | Pie data                       |
| GET    | `/api/analytics/alerts`           | auth            | Low / expiring / expired       |

## Notes

- Tailwind directives (`@tailwind`, `@apply`) may show editor warnings in `frontend/src/index.css`. They are valid and processed by PostCSS at build time.
- Change `JWT_SECRET` to a strong random string for any non-local deployment.
