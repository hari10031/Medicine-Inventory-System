const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const sign = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'username and password required' });
  const user = await User.findOne({ username: username.toLowerCase() });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await user.comparePassword(password);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  return res.json({ token: sign(user), user });
});

// Admin can create users (employees or other admins)
router.post('/register', requireAuth, requireRole('admin'), async (req, res) => {
  const { username, password, role = 'employee', name } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'username and password required' });
  const exists = await User.findOne({ username: username.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'Username already exists' });
  const user = await User.create({ username: username.toLowerCase(), password, role, name });
  res.status(201).json({ user });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

router.get('/users', requireAuth, requireRole('admin'), async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users });
});

module.exports = router;
