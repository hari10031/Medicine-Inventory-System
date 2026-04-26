const express = require('express');
const Medicine = require('../models/Medicine');
const Transaction = require('../models/Transaction');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', requireAuth, requireRole('admin'), async (_req, res) => {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);

  const [totalMeds, lowStock, expiringSoon, expired, totalUnits, txCount] = await Promise.all([
    Medicine.countDocuments(),
    Medicine.countDocuments({ remainingQuantity: { $lte: 10 } }),
    Medicine.countDocuments({ expiryDate: { $gte: now, $lte: in30 } }),
    Medicine.countDocuments({ expiryDate: { $lt: now } }),
    Medicine.aggregate([{ $group: { _id: null, total: { $sum: '$remainingQuantity' } } }]),
    Transaction.countDocuments(),
  ]);

  res.json({
    totalMedicines: totalMeds,
    lowStock,
    expiringSoon,
    expired,
    totalUnitsInStock: totalUnits[0]?.total || 0,
    totalTransactions: txCount,
  });
});

// Sales trend: daily, weekly, monthly
router.get('/sales-trend', requireAuth, requireRole('admin'), async (req, res) => {
  const { period = 'daily', days = 30 } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - parseInt(days));

  const fmt =
    period === 'monthly'
      ? { y: { $year: '$date' }, m: { $month: '$date' } }
      : period === 'weekly'
        ? { y: { $year: '$date' }, w: { $isoWeek: '$date' } }
        : { y: { $year: '$date' }, m: { $month: '$date' }, d: { $dayOfMonth: '$date' } };

  const data = await Transaction.aggregate([
    { $match: { date: { $gte: since } } },
    {
      $group: {
        _id: fmt,
        units: { $sum: '$quantitySold' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1, '_id.w': 1 } },
  ]);

  const series = data.map((d) => {
    const { y, m, d: day, w } = d._id;
    let label;
    if (period === 'monthly') label = `${y}-${String(m).padStart(2, '0')}`;
    else if (period === 'weekly') label = `${y}-W${String(w).padStart(2, '0')}`;
    else label = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { label, units: d.units, count: d.count };
  });

  res.json({ period, series });
});

router.get('/top-medicines', requireAuth, requireRole('admin'), async (req, res) => {
  const { limit = 5 } = req.query;
  const data = await Transaction.aggregate([
    { $group: { _id: '$medicineName', units: { $sum: '$quantitySold' } } },
    { $sort: { units: -1 } },
    { $limit: parseInt(limit) },
  ]);
  res.json({ items: data.map((d) => ({ name: d._id, units: d.units })) });
});

router.get('/stock-distribution', requireAuth, requireRole('admin'), async (_req, res) => {
  const data = await Medicine.aggregate([
    { $group: { _id: '$name', units: { $sum: '$remainingQuantity' } } },
    { $sort: { units: -1 } },
    { $limit: 8 },
  ]);
  res.json({ items: data.map((d) => ({ name: d._id, units: d.units })) });
});

router.get('/alerts', requireAuth, async (_req, res) => {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);
  const [low, expiring, expired] = await Promise.all([
    Medicine.find({ remainingQuantity: { $lte: 10 } }).limit(20).sort({ remainingQuantity: 1 }),
    Medicine.find({ expiryDate: { $gte: now, $lte: in30 } }).limit(20).sort({ expiryDate: 1 }),
    Medicine.find({ expiryDate: { $lt: now } }).limit(20).sort({ expiryDate: -1 }),
  ]);
  res.json({ lowStock: low, expiringSoon: expiring, expired });
});

module.exports = router;
