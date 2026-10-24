const mongoose = require('mongoose');

const ProductionSchema = new mongoose.Schema(
  {
    date: {
      type: String, // Format: YYYY-MM-DD
      required: [true, 'Production date is required'],
      index: true,
    },
    hourNumber: {
      type: Number,
      required: [true, 'Hour number (1 to 8) is required'],
      min: [1, 'Hour number must be between 1 and 8'],
      max: [8, 'Hour number must be between 1 and 8'],
    },
    hourTime: {
      type: String,
      required: [true, 'Hour time slot is required (e.g. 08:00 - 09:00)'],
      trim: true,
    },
    pieces: {
      type: Number,
      required: [true, 'Pieces produced is required'],
      min: [0, 'Pieces cannot be negative'],
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

// Prevent duplicate entries for the same hour on the same date
ProductionSchema.index({ date: 1, hourNumber: 1 }, { unique: true });

module.exports = mongoose.model('Production', ProductionSchema);
