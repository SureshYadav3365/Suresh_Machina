const mongoose = require('mongoose');

const MachineSettingsSchema = new mongoose.Schema(
  {
    machineName: {
      type: String,
      default: 'Hydraulic Double Die Dona Machine #1',
      trim: true,
    },
    shiftStartTime: {
      type: String,
      default: '08:00',
      trim: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide a valid time format (HH:mm)'],
    },
    shiftHours: {
      type: Number,
      default: 8,
      min: 1,
      max: 24,
    },
    defaultDieType: {
      type: String,
      default: '6-inch Wrinkle Dona',
      trim: true,
    },
    hourlyTargetPieces: {
      type: Number,
      default: 1200,
      min: 0,
    },
    operatorName: {
      type: String,
      default: 'Primary Operator',
      trim: true,
    },
    currencySymbol: {
      type: String,
      default: '₹',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('MachineSettings', MachineSettingsSchema);
