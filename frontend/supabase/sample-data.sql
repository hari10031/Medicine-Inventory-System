-- =====================================================================
-- MedStock — Sample medicine data
-- Run this AFTER schema.sql + seed.sql (optional).
--
-- Adds 20 sample medicines with a mix of:
--   - healthy stock
--   - low stock (≤ 10)
--   - expiring soon (within 30 days)
--   - already expired
-- so the dashboard alerts and analytics charts have meaningful data.
--
-- Idempotent: ON CONFLICT DO NOTHING on (name, batch_no).
-- =====================================================================

insert into public.medicines (name, batch_no, manufacturing_date, expiry_date, quantity, remaining_quantity)
values
  -- Healthy stock, far from expiry
  ('Paracetamol 500mg',     'PCM-001', '2025-01-15', '2027-01-15', 500, 420),
  ('Ibuprofen 400mg',       'IBU-001', '2025-03-10', '2027-03-10', 300, 250),
  ('Amoxicillin 250mg',     'AMX-001', '2025-02-20', '2027-02-20', 200, 180),
  ('Cetirizine 10mg',       'CET-001', '2025-04-05', '2027-04-05', 400, 350),
  ('Omeprazole 20mg',       'OMP-001', '2025-05-12', '2027-05-12', 250, 200),
  ('Metformin 500mg',       'MET-001', '2025-01-08', '2027-01-08', 600, 540),
  ('Atorvastatin 10mg',     'ATR-001', '2025-02-14', '2027-02-14', 350, 300),
  ('Amlodipine 5mg',        'AML-001', '2025-03-22', '2027-03-22', 280, 240),

  -- Low stock (≤ 10) — should show in low-stock alert
  ('Azithromycin 500mg',    'AZI-001', '2025-06-01', '2027-06-01', 50,  8),
  ('Ciprofloxacin 500mg',   'CIP-001', '2025-05-15', '2027-05-15', 40,  5),
  ('Diclofenac 50mg',       'DIC-001', '2025-04-20', '2027-04-20', 60,  3),
  ('Pantoprazole 40mg',     'PNT-001', '2025-05-30', '2027-05-30', 35,  10),

  -- Expiring soon (within 30 days from today, 2026-04-29)
  ('Cough Syrup 100ml',     'CGH-001', '2024-05-20', current_date + 7,  120, 90),
  ('Vitamin C 500mg',       'VTC-001', '2024-05-25', current_date + 14, 200, 150),
  ('Antacid Tablets',       'ATD-001', '2024-05-15', current_date + 21, 180, 130),
  ('ORS Sachets',           'ORS-001', '2024-05-30', current_date + 28, 250, 200),

  -- Already expired (yesterday-ish) — should show in expired alert
  ('Cold Relief Syrup',     'CLD-001', '2024-04-15', current_date - 1,  100, 60),
  ('Eye Drops 10ml',        'EYE-001', '2024-03-10', current_date - 7,  80,  40),

  -- More healthy stock for variety
  ('Aspirin 75mg',          'ASP-001', '2025-02-05', '2027-02-05', 450, 380),
  ('Loratadine 10mg',       'LOR-001', '2025-03-18', '2027-03-18', 220, 190)
on conflict (name, batch_no) do nothing;

-- Verify
select count(*) as total_medicines,
       sum(remaining_quantity) as total_units_in_stock,
       count(*) filter (where remaining_quantity <= 10) as low_stock,
       count(*) filter (where expiry_date < current_date) as expired,
       count(*) filter (where expiry_date >= current_date and expiry_date <= current_date + 30) as expiring_soon
  from public.medicines;
