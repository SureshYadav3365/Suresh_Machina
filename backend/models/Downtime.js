const mongoose = require('mongoose');

const DowntimeSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: [true, 'Downtime date is required'],
      index: true,
    },
    startTime: {
      type: String, // HH:mm
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide a valid start time (HH:mm)'],
    },
    endTime: {
      type: String, // HH:mm
      required: [true, 'End time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide a valid end time (HH:mm)'],
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    reason: {
      type: String,
      required: [true, 'Downtime reason is required'],
      enum: [
        'Paper Roll Change',
        'Die Jam / Paper Tear',
        'Die Temperature / Heating Issue',
        'Hydraulic / Punching Mechanism',
        'Power Outage / Low Voltage',
        'Lubrication & Daily Maintenance',
        'Operator Lunch / Rest Break',
        'Die Changeover',
        'Other / Unscheduled',
      ],
      default: 'Paper Roll Change',
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

// Pre-validate hook to calculate duration automatically if both times provided
DowntimeSchema.pre('validate', function () {
  if (this.startTime && this.endTime && !this.durationMinutes) {
    const [startH, startM] = this.startTime.split(':').map(Number);
    const [endH, endM] = this.endTime.split(':').map(Number);
    let startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;
    if (endTotal < startTotal) {
      // Over midnight
      endTotal += 24 * 60;
    }
    this.durationMinutes = Math.max(1, endTotal - startTotal);
  }
});

module.exports = mongoose.model('Downtime', DowntimeSchema);
