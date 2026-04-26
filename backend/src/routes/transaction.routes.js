const express = require('express');
const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const Transaction = require('../models/Transaction');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Dispense (employee or admin)
router.post('/dispense', requireAuth, async (req, res) => {
  const { medicineId, quantitySold, customerName, customerPhone, reason } = req.body || {};
  const qty = Number(quantitySold);
  if (!medicineId || !qty || qty <= 0) {
    return res.status(400).json({ message: 'medicineId and positive quantitySold required' });
  }
  if (!customerName || !customerName.trim()) {
    return res.status(400).json({ message: 'Recipient name (customerName) is required' });
  }
  if (!mongoose.isValidObjectId(medicineId)) return res.status(400).json({ message: 'Invalid medicineId' });

  const med = await Medicine.findById(medicineId);
  if (!med) return res.status(404).json({ message: 'Medicine not found' });
  if (med.remainingQuantity < qty) {
    return res.status(400).json({ message: `Insufficient stock. Remaining: ${med.remainingQuantity}` });
  }
  if (new Date(med.expiryDate) < new Date()) {
    return res.status(400).json({ message: 'Medicine has expired' });
  }

  med.remainingQuantity -= qty;
  await med.save();

  const tx = await Transaction.create({
    medicineId: med._id,
    medicineName: med.name,
    batchNo: med.batchNo,
    quantitySold: qty,
    customerName: customerName.trim(),
    customerPhone: customerPhone?.trim() || '',
    reason: reason?.trim() || '',
    handledBy: req.user._id,
    handledByName: req.user.name || req.user.username,
  });

  res.status(201).json({ transaction: tx, medicine: med });
});

// List transactions
router.get('/', requireAuth, async (req, res) => {
  const { from, to, medicineId, handledBy, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (medicineId && mongoose.isValidObjectId(medicineId)) filter.medicineId = medicineId;
  if (handledBy && mongoose.isValidObjectId(handledBy)) filter.handledBy = handledBy;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  // Employees only see their own logs
  if (req.user.role !== 'admin') filter.handledBy = req.user._id;

  const p = Math.max(1, parseInt(page));
  const l = Math.min(200, Math.max(1, parseInt(limit)));
  const [items, total] = await Promise.all([
    Transaction.find(filter).sort({ date: -1 }).skip((p - 1) * l).limit(l),
    Transaction.countDocuments(filter),
  ]);
  res.json({ items, total, page: p, limit: l });
});

module.exports = router;
