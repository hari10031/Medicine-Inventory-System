const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const Medicine = require('../models/Medicine');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// List with filters & sorting
router.get('/', requireAuth, async (req, res) => {
  const {
    q,
    name,
    batchNo,
    expiryBefore,
    expiryAfter,
    sortBy = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 50,
  } = req.query;

  const filter = {};
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { batchNo: new RegExp(q, 'i') }];
  if (name) filter.name = new RegExp(name, 'i');
  if (batchNo) filter.batchNo = new RegExp(batchNo, 'i');
  if (expiryBefore || expiryAfter) {
    filter.expiryDate = {};
    if (expiryBefore) filter.expiryDate.$lte = new Date(expiryBefore);
    if (expiryAfter) filter.expiryDate.$gte = new Date(expiryAfter);
  }

  const sort = { [sortBy]: order === 'asc' ? 1 : -1 };
  const p = Math.max(1, parseInt(page));
  const l = Math.min(200, Math.max(1, parseInt(limit)));

  const [items, total] = await Promise.all([
    Medicine.find(filter).sort(sort).skip((p - 1) * l).limit(l),
    Medicine.countDocuments(filter),
  ]);
  res.json({ items, total, page: p, limit: l });
});

router.get('/:id', requireAuth, async (req, res) => {
  const med = await Medicine.findById(req.params.id);
  if (!med) return res.status(404).json({ message: 'Not found' });
  res.json(med);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { name, batchNo, manufacturingDate, expiryDate, quantity } = req.body;
    if (!name || !batchNo || !manufacturingDate || !expiryDate || quantity == null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (new Date(expiryDate) <= new Date(manufacturingDate)) {
      return res.status(400).json({ message: 'expiryDate must be after manufacturingDate' });
    }
    const med = await Medicine.create({
      name: name.trim(),
      batchNo: batchNo.trim(),
      manufacturingDate,
      expiryDate,
      quantity,
      remainingQuantity: quantity,
    });
    res.status(201).json(med);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'Medicine with same name and batch already exists' });
    res.status(400).json({ message: e.message });
  }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const med = await Medicine.findById(req.params.id);
    if (!med) return res.status(404).json({ message: 'Not found' });
    const { name, batchNo, manufacturingDate, expiryDate, quantity } = req.body;
    if (name != null) med.name = name.trim();
    if (batchNo != null) med.batchNo = batchNo.trim();
    if (manufacturingDate != null) med.manufacturingDate = manufacturingDate;
    if (expiryDate != null) med.expiryDate = expiryDate;
    if (quantity != null) {
      const dispensed = med.quantity - med.remainingQuantity;
      med.quantity = quantity;
      med.remainingQuantity = Math.max(0, quantity - dispensed);
    }
    if (new Date(med.expiryDate) <= new Date(med.manufacturingDate)) {
      return res.status(400).json({ message: 'expiryDate must be after manufacturingDate' });
    }
    await med.save();
    res.json(med);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'Duplicate name + batch' });
    res.status(400).json({ message: e.message });
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const med = await Medicine.findByIdAndDelete(req.params.id);
  if (!med) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
});

// Bulk upload preview/save
const parseSheet = (buffer) => {
  const wb = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return xlsx.utils.sheet_to_json(ws, { defval: '' });
};

const normalizeRow = (row, idx) => {
  const get = (...keys) => {
    for (const k of keys) {
      const found = Object.keys(row).find((rk) => rk.toLowerCase().replace(/[\s_]/g, '') === k.toLowerCase().replace(/[\s_]/g, ''));
      if (found && row[found] !== '' && row[found] != null) return row[found];
    }
    return undefined;
  };
  const name = get('name', 'medicine', 'medicinename');
  const batchNo = get('batchNo', 'batch', 'batchnumber');
  const manufacturingDate = get('manufacturingDate', 'mfg', 'mfgdate', 'manufactureddate');
  const expiryDate = get('expiryDate', 'expiry', 'exp', 'expdate');
  const quantity = get('quantity', 'qty', 'totalquantity');
  const errors = [];
  if (!name) errors.push('name missing');
  if (!batchNo) errors.push('batchNo missing');
  if (!manufacturingDate) errors.push('manufacturingDate missing');
  if (!expiryDate) errors.push('expiryDate missing');
  if (quantity === undefined || isNaN(Number(quantity))) errors.push('quantity invalid');

  const md = manufacturingDate ? new Date(manufacturingDate) : null;
  const ed = expiryDate ? new Date(expiryDate) : null;
  if (md && isNaN(md.getTime())) errors.push('manufacturingDate invalid');
  if (ed && isNaN(ed.getTime())) errors.push('expiryDate invalid');
  if (md && ed && ed <= md) errors.push('expiry must be after manufacturing');

  return {
    row: idx + 2,
    valid: errors.length === 0,
    errors,
    data: {
      name: name ? String(name).trim() : '',
      batchNo: batchNo ? String(batchNo).trim() : '',
      manufacturingDate: md,
      expiryDate: ed,
      quantity: Number(quantity),
      remainingQuantity: Number(quantity),
    },
  };
};

router.post('/bulk/preview', requireAuth, requireRole('admin'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'file required' });
  try {
    const rows = parseSheet(req.file.buffer);
    const parsed = rows.map(normalizeRow);
    res.json({ total: parsed.length, validCount: parsed.filter((r) => r.valid).length, rows: parsed });
  } catch (e) {
    res.status(400).json({ message: 'Failed to parse file: ' + e.message });
  }
});

router.post('/bulk/save', requireAuth, requireRole('admin'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'file required' });
  try {
    const rows = parseSheet(req.file.buffer);
    const parsed = rows.map(normalizeRow);
    const valid = parsed.filter((r) => r.valid).map((r) => r.data);
    let inserted = 0;
    let skipped = 0;
    const errors = [];
    for (const item of valid) {
      try {
        await Medicine.create(item);
        inserted++;
      } catch (e) {
        skipped++;
        errors.push({ name: item.name, batchNo: item.batchNo, message: e.code === 11000 ? 'duplicate' : e.message });
      }
    }
    res.json({ inserted, skipped, invalid: parsed.length - valid.length, errors });
  } catch (e) {
    res.status(400).json({ message: 'Failed to save: ' + e.message });
  }
});

module.exports = router;
