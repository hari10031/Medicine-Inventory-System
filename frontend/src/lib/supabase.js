import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars');
}

export const supabase = createClient(url || 'http://localhost', key || 'anon', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'medstock-auth',
  },
});

// Username login uses a synthetic email under @medstock.local
// (Supabase Auth requires email; this lets us keep username UX without sending real mail.)
export const usernameToEmail = (u) =>
  `${String(u || '').toLowerCase().trim()}@medstock.local`;

// ---------- Row mappers (snake_case → camelCase used by UI) ----------

export const fromMedicineRow = (r) =>
  r && {
    _id: r.id,
    id: r.id,
    name: r.name,
    batchNo: r.batch_no,
    manufacturingDate: r.manufacturing_date,
    expiryDate: r.expiry_date,
    quantity: r.quantity,
    remainingQuantity: r.remaining_quantity,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };

export const fromTransactionRow = (r) =>
  r && {
    _id: r.id,
    id: r.id,
    medicineId: r.medicine_id,
    medicineName: r.medicine_name,
    batchNo: r.batch_no,
    quantitySold: r.quantity_sold,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    reason: r.reason,
    handledBy: r.handled_by,
    handledByName: r.handled_by_name,
    date: r.date,
  };

export const fromProfileRow = (r) =>
  r && {
    _id: r.id,
    id: r.id,
    username: r.username,
    name: r.name,
    role: r.role,
    createdAt: r.created_at,
  };
