const Downtime = require('../models/Downtime');

// Helper to calculate minutes between two HH:mm strings
const calculateMinutes = (start, end) => {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let startTotal = startH * 60 + startM;
  let endTotal = endH * 60 + endM;
  if (endTotal < startTotal) {
    endTotal += 24 * 60; // Crosses midnight
  }
  return endTotal - startTotal;
};

// GET /api/downtime?date=YYYY-MM-DD
exports.getDowntimeRecords = async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    let query = {};

    if (date) {
      query.date = date;
    } else if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const records = await Downtime.find(query).sort({ date: -1, startTime: 1 });

    const totalMinutes = records.reduce((sum, item) => sum + (item.durationMinutes || 0), 0);
    const totalHours = Number((totalMinutes / 60).toFixed(1));

    // Group by reason
    const reasonBreakdown = records.reduce((acc, curr) => {
      acc[curr.reason] = (acc[curr.reason] || 0) + curr.durationMinutes;
      return acc;
    }, {});

    res.json({
      success: true,
      count: records.length,
      data: records,
      summary: {
        totalMinutes,
        totalHours,
        reasonBreakdown,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/downtime
exports.createDowntimeRecord = async (req, res) => {
  try {
    const { date, startTime, endTime, reason, notes } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required (YYYY-MM-DD)' });
    }
    if (!startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Both start time and end time are required' });
    }
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Downtime reason is required' });
    }

    const durationMinutes = calculateMinutes(startTime, endTime);
    if (durationMinutes <= 0) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time',
      });
    }

    const record = await Downtime.create({
      date,
      startTime,
      endTime,
      durationMinutes,
      reason,
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      message: `Downtime of ${durationMinutes} mins logged successfully`,
      data: record,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/downtime/:id
exports.updateDowntimeRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, reason, notes, date } = req.body;

    const record = await Downtime.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Downtime record not found' });
    }

    if (date) record.date = date;
    if (startTime) record.startTime = startTime;
    if (endTime) record.endTime = endTime;
    if (reason) record.reason = reason;
    if (notes !== undefined) record.notes = notes;

    record.durationMinutes = calculateMinutes(record.startTime, record.endTime);
    await record.save();

    res.json({
      success: true,
      message: 'Downtime record updated successfully',
      data: record,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/downtime/:id
exports.deleteDowntimeRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Downtime.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Downtime record not found' });
    }
    res.json({ success: true, message: 'Downtime record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
