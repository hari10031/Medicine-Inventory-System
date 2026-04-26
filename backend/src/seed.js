require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Medicine = require('./models/Medicine');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medicine_inventory');
  console.log('Connected, seeding...');

  const adminExists = await User.findOne({ username: 'admin' });
  if (!adminExists) {
    await User.create({ username: 'admin', password: 'admin123', role: 'admin', name: 'Administrator' });
    console.log('Created admin: admin / admin123');
  }
  const empExists = await User.findOne({ username: 'employee' });
  if (!empExists) {
    await User.create({ username: 'employee', password: 'employee123', role: 'employee', name: 'Employee One' });
    console.log('Created employee: employee / employee123');
  }

  const count = await Medicine.countDocuments();
  if (count === 0) {
    const today = new Date();
    const samples = [
      { name: 'Paracetamol 500mg', batchNo: 'PCM-001', mfg: -180, exp: 540, qty: 200 },
      { name: 'Amoxicillin 250mg', batchNo: 'AMX-100', mfg: -90, exp: 365, qty: 80 },
      { name: 'Ibuprofen 400mg', batchNo: 'IBU-220', mfg: -200, exp: 20, qty: 50 },
      { name: 'Cetirizine 10mg', batchNo: 'CET-501', mfg: -300, exp: -10, qty: 60 },
      { name: 'Vitamin C 500mg', batchNo: 'VIT-77', mfg: -30, exp: 700, qty: 8 },
    ];
    for (const s of samples) {
      const mfg = new Date(today); mfg.setDate(mfg.getDate() + s.mfg);
      const exp = new Date(today); exp.setDate(exp.getDate() + s.exp);
      await Medicine.create({
        name: s.name, batchNo: s.batchNo,
        manufacturingDate: mfg, expiryDate: exp,
        quantity: s.qty, remainingQuantity: s.qty,
      });
    }
    console.log('Inserted sample medicines.');
  }

  await mongoose.disconnect();
  console.log('Done.');
})().catch((e) => { console.error(e); process.exit(1); });
