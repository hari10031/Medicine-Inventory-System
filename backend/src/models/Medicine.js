const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    batchNo: { type: String, required: true, trim: true, index: true },
    manufacturingDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    quantity: { type: Number, required: true, min: 0 },
    remainingQuantity: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

medicineSchema.index({ name: 1, batchNo: 1 }, { unique: true });

module.exports = mongoose.model('Medicine', medicineSchema);
