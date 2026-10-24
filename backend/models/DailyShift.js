const mongoose = require('mongoose');

const DailyShiftSchema = new mongoose.Schema(
  {
    date: {
      type: String, // Format: YYYY-MM-DD
      required: [true, 'Shift date is required'],
      unique: true,
      index: true,
    },
    startTime: {
      type: String, // Format: HH:mm (24-hour)
      required: [true, 'Shift start time is required'],
      default: '08:00',
      trim: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide a valid time format (HH:mm)'],
    },
    shiftHours: {
      type: Number,
      default: 8,
      min: [1, 'Shift hours must be at least 1'],
      max: [24, 'Shift hours cannot exceed 24'],
    },
    endTime: {
      type: String, // Format: HH:mm (automatically computed as startTime + shiftHours)
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DailyShift', DailyShiftSchema);
