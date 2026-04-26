const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
    medicineName: { type: String, required: true },
    batchNo: { type: String, required: true },
    quantitySold: { type: Number, required: true, min: 1 },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    reason: { type: String, trim: true },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    handledByName: { type: String },
    date: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
