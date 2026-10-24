const mongoose = require('mongoose');

const DailySalesSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: [true, 'Date is required'],
      unique: true,
      index: true,
    },
    revenue: {
      type: Number,
      default: 0,
      min: [0, 'Revenue cannot be negative'],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DailySales', DailySalesSchema);
