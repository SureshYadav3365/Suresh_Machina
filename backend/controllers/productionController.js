const Production = require('../models/Production');
const Expense = require('../models/Expense');
const DailySales = require('../models/DailySales');
const DailyShift = require('../models/DailyShift');

/**
 * Normalizes and validates time format HH:mm
 */
const normalizeTime = (timeStr, defaultTime = '08:00') => {
  if (!timeStr) return defaultTime;
  let str = String(timeStr).trim();
  if (/^\d:\d\d$/.test(str)) str = '0' + str;
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(str)) return str;
  return defaultTime;
};

/**
 * Computes 8 hourly shift slots and end time based on any arbitrary start time
 */
const computeShiftTimeDetails = (startTimeStr = '08:00', totalHours = 8) => {
  const validStartTime = normalizeTime(startTimeStr, '08:00');
  const [startH, startM] = validStartTime.split(':').map(Number);
  const startTotalMinutes = startH * 60 + startM;

  const formatTime = (totalMinutes) => {
    const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const slots = [];
  for (let i = 0; i < totalHours; i++) {
    const slotStartMin = startTotalMinutes + i * 60;
    const slotEndMin = slotStartMin + 60;
    const startFormatted = formatTime(slotStartMin);
    const endFormatted = formatTime(slotEndMin);

    slots.push({
      hourNumber: i + 1,
      hourTime: `${startFormatted} - ${endFormatted}`,
      startTime: startFormatted,
      endTime: endFormatted,
    });
  }

  const endTotalMinutes = startTotalMinutes + totalHours * 60;
  const endTime = formatTime(endTotalMinutes);

  return {
    startTime: validStartTime,
    endTime,
    shiftHours: totalHours,
    slots,
  };
};

/**
 * Computes elapsed and remaining shift time, progress percentage,
 * and current ongoing / completed / upcoming slot statuses.
 */
const computeShiftMetrics = (dateStr, startTimeStr = '08:00', totalHours = 8, now = new Date()) => {
  const validStartTime = normalizeTime(startTimeStr, '08:00');
  const [y, m, d] = dateStr.split('-').map(Number);
  const [sH, sM] = validStartTime.split(':').map(Number);

  // Shift start in local calendar date
  const shiftStartDate = new Date(y, m - 1, d, sH, sM, 0, 0);
  const shiftEndDate = new Date(shiftStartDate.getTime() + totalHours * 60 * 60 * 1000);
  const totalShiftMinutes = totalHours * 60;

  let status = 'upcoming'; // 'upcoming' | 'ongoing' | 'completed'
  let elapsedMinutes = 0;
  let remainingMinutes = totalShiftMinutes;
  let progressPercent = 0;
  let currentSlotNumber = null;

  const nowMs = now.getTime();
  const startMs = shiftStartDate.getTime();
  const endMs = shiftEndDate.getTime();

  if (nowMs < startMs) {
    status = 'upcoming';
    elapsedMinutes = 0;
    remainingMinutes = totalShiftMinutes;
    progressPercent = 0;
  } else if (nowMs >= endMs) {
    status = 'completed';
    elapsedMinutes = totalShiftMinutes;
    remainingMinutes = 0;
    progressPercent = 100;
  } else {
    status = 'ongoing';
    elapsedMinutes = Math.floor((nowMs - startMs) / (60 * 1000));
    remainingMinutes = Math.max(0, totalShiftMinutes - elapsedMinutes);
    progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMinutes / totalShiftMinutes) * 100)));
  }

  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0 && m === 0) return '0m';
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const slotMetrics = [];
  for (let i = 0; i < totalHours; i++) {
    const slotStart = new Date(shiftStartDate.getTime() + i * 60 * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

    let timeStatus = 'upcoming';
    if (nowMs >= slotEnd.getTime()) {
      timeStatus = 'completed';
    } else if (nowMs >= slotStart.getTime() && nowMs < slotEnd.getTime()) {
      timeStatus = 'ongoing';
      currentSlotNumber = i + 1;
    } else {
      timeStatus = 'upcoming';
    }

    slotMetrics.push({
      hourNumber: i + 1,
      timeStatus,
      isOngoing: timeStatus === 'ongoing',
    });
  }

  return {
    status,
    elapsedMinutes,
    remainingMinutes,
    elapsedFormatted: formatDuration(elapsedMinutes),
    remainingFormatted: formatDuration(remainingMinutes),
    progressPercent,
    currentSlotNumber,
    slotMetrics,
  };
};

// Helper to get today's date string YYYY-MM-DD
const getTodayDate = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// GET /api/production?date=YYYY-MM-DD
exports.getProduction = async (req, res) => {
  try {
    const date = req.query.date || getTodayDate();

    // 1. Look up DailyShift for this specific date
    let dailyShift = await DailyShift.findOne({ date });
    let shiftStartTime = dailyShift ? dailyShift.startTime : null;

    // Existing production records for this date
    const records = await Production.find({ date }).sort({ hourNumber: 1 });

    // If no DailyShift saved, deduce from existing records if available
    if (!shiftStartTime && records.length > 0) {
      const firstRec = records[0];
      if (firstRec.hourTime && firstRec.hourTime.includes('-')) {
        const slotStartStr = firstRec.hourTime.split('-')[0].trim();
        if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(slotStartStr)) {
          const [hH, hM] = slotStartStr.split(':').map(Number);
          const startMin = ((hH * 60 + hM - (firstRec.hourNumber - 1) * 60) + 24 * 60) % (24 * 60);
          const sH = Math.floor(startMin / 60);
          const sM = startMin % 60;
          shiftStartTime = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`;
        }
      }
    }

    // Fallback default if completely brand new date
    if (!shiftStartTime) {
      shiftStartTime = '08:00';
    }

    const shiftInfo = computeShiftTimeDetails(shiftStartTime, 8);
    const shiftMetrics = computeShiftMetrics(date, shiftStartTime, 8);

    // Map records by hourNumber
    const recordMap = {};
    let totalPieces = 0;
    records.forEach((r) => {
      recordMap[r.hourNumber] = r;
      totalPieces += r.pieces;
    });

    // Build complete 8-hour view with dynamic slot times and timeStatus
    const hours = shiftInfo.slots.map((slot) => {
      const rec = recordMap[slot.hourNumber];
      const slotMetric = shiftMetrics.slotMetrics[slot.hourNumber - 1] || {};
      return {
        hourNumber: slot.hourNumber,
        hourTime: slot.hourTime,
        startTime: slot.startTime,
        endTime: slot.endTime,
        pieces: rec ? rec.pieces : 0,
        isRecorded: !!rec,
        notes: rec ? rec.notes : '',
        id: rec ? rec._id : null,
        timeStatus: slotMetric.timeStatus || 'upcoming', // 'completed' | 'ongoing' | 'upcoming'
        isOngoing: slotMetric.timeStatus === 'ongoing',
      };
    });

    const completedHours = records.length;
    const averagePerHour =
      completedHours > 0 ? Math.round(totalPieces / completedHours) : 0;

    // Monthly pieces
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyAgg = await Production.aggregate([
      { $match: { date: { $regex: `^${currentMonthPrefix}` } } },
      { $group: { _id: null, total: { $sum: '$pieces' } } },
    ]);
    const monthlyPieces = monthlyAgg.length > 0 ? monthlyAgg[0].total : 0;

    // All-time pieces
    const allTimeAgg = await Production.aggregate([
      { $group: { _id: null, total: { $sum: '$pieces' } } },
    ]);
    const allTimePieces = allTimeAgg.length > 0 ? allTimeAgg[0].total : 0;

    // Expenses & Sales Revenue
    const dayExpenses = await Expense.find({ date });
    const todayExpenses = dayExpenses.reduce((sum, item) => sum + item.amount, 0);

    const salesRecord = await DailySales.findOne({ date });
    const actualRevenue = salesRecord ? salesRecord.revenue : 0;
    const hasRevenueRecorded = !!salesRecord && salesRecord.revenue > 0;
    const estimatedProfit = hasRevenueRecorded ? (actualRevenue - todayExpenses) : null;

    res.json({
      success: true,
      date,
      shiftStartTime: shiftInfo.startTime,
      shiftEndTime: shiftInfo.endTime,
      shiftHours: shiftInfo.shiftHours,
      shiftStatus: shiftMetrics.status,
      shiftElapsedMinutes: shiftMetrics.elapsedMinutes,
      shiftRemainingMinutes: shiftMetrics.remainingMinutes,
      shiftElapsedFormatted: shiftMetrics.elapsedFormatted,
      shiftRemainingFormatted: shiftMetrics.remainingFormatted,
      shiftProgressPercent: shiftMetrics.progressPercent,
      currentSlotNumber: shiftMetrics.currentSlotNumber,
      totalPieces,
      todayPieces: totalPieces,
      monthlyPieces,
      allTimePieces,
      currentMonthLabel: currentMonthPrefix,
      completedHours,
      averagePerHour,
      todayExpenses,
      actualRevenue,
      hasRevenueRecorded,
      estimatedProfit,
      hours,
      records,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/production/shift - Set or update the actual shift start time for a date
exports.setDailyShift = async (req, res) => {
  try {
    const { date, startTime, shiftHours = 8 } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required (YYYY-MM-DD)' });
    }

    const cleanStart = normalizeTime(startTime, '08:00');
    const shiftInfo = computeShiftTimeDetails(cleanStart, Number(shiftHours) || 8);

    const shiftDoc = await DailyShift.findOneAndUpdate(
      { date },
      {
        date,
        startTime: cleanStart,
        shiftHours: shiftInfo.shiftHours,
        endTime: shiftInfo.endTime,
      },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    // Update existing production records on this date to synchronize slot hourTimes
    for (const slot of shiftInfo.slots) {
      await Production.updateMany(
        { date, hourNumber: slot.hourNumber },
        { $set: { hourTime: slot.hourTime } }
      );
    }

    const shiftMetrics = computeShiftMetrics(date, cleanStart, shiftInfo.shiftHours);

    res.json({
      success: true,
      message: `Shift start time for ${date} updated to ${cleanStart} (Ends at ${shiftInfo.endTime})`,
      data: shiftDoc,
      shiftStartTime: shiftInfo.startTime,
      shiftEndTime: shiftInfo.endTime,
      shiftHours: shiftInfo.shiftHours,
      shiftStatus: shiftMetrics.status,
      shiftElapsedFormatted: shiftMetrics.elapsedFormatted,
      shiftRemainingFormatted: shiftMetrics.remainingFormatted,
      shiftProgressPercent: shiftMetrics.progressPercent,
      currentSlotNumber: shiftMetrics.currentSlotNumber,
      slots: shiftInfo.slots,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/production/history?month=YYYY-MM&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
exports.getProductionHistory = async (req, res) => {
  try {
    const { month, startDate, endDate } = req.query;
    let matchQuery = {};

    if (month && month !== 'all') {
      matchQuery.date = { $regex: `^${month}` };
    } else if (startDate && endDate) {
      matchQuery.date = { $gte: startDate, $lte: endDate };
    }

    // Aggregate records grouped by date
    const dayGroups = await Production.aggregate([
      { $match: matchQuery },
      { $sort: { hourNumber: 1 } },
      {
        $group: {
          _id: '$date',
          totalPieces: { $sum: '$pieces' },
          hoursCount: { $sum: 1 },
          records: {
            $push: {
              _id: '$_id',
              hourNumber: '$hourNumber',
              hourTime: '$hourTime',
              pieces: '$pieces',
              notes: '$notes',
              updatedAt: '$updatedAt',
            },
          },
        },
      },
      { $sort: { _id: -1 } }, // Newest date first
    ]);

    const dates = dayGroups.map((d) => d._id);
    const shifts = await DailyShift.find({ date: { $in: dates } });
    const shiftMap = {};
    shifts.forEach((s) => {
      shiftMap[s.date] = s;
    });

    const days = dayGroups.map((d) => {
      const recordsSorted = d.records.sort((a, b) => a.hourNumber - b.hourNumber);
      const savedShift = shiftMap[d._id];

      let shiftStartTime = savedShift ? savedShift.startTime : '';
      let shiftEndTime = savedShift ? savedShift.endTime : '';

      // If no saved shift, deduce from records
      if (!shiftStartTime && recordsSorted.length > 0) {
        const r1 = recordsSorted[0];
        if (r1.hourTime && r1.hourTime.includes('-')) {
          const parts = r1.hourTime.split('-');
          shiftStartTime = parts[0].trim();
          const rLast = recordsSorted[recordsSorted.length - 1];
          if (rLast && rLast.hourTime && rLast.hourTime.includes('-')) {
            shiftEndTime = rLast.hourTime.split('-')[1].trim();
          }
        }
      }

      if (!shiftStartTime) {
        shiftStartTime = '08:00';
        shiftEndTime = '16:00';
      }

      return {
        date: d._id,
        shiftStartTime,
        shiftEndTime,
        totalPieces: d.totalPieces,
        hoursCount: d.hoursCount,
        averagePerHour: d.hoursCount > 0 ? Math.round(d.totalPieces / d.hoursCount) : 0,
        records: recordsSorted,
      };
    });

    const periodTotalPieces = days.reduce((sum, d) => sum + d.totalPieces, 0);

    // List of all distinct months with records for dropdown filter
    const distinctDates = await Production.distinct('date');
    const availableMonths = [
      ...new Set(distinctDates.map((d) => d.slice(0, 7))),
    ].sort().reverse();

    res.json({
      success: true,
      totalDays: days.length,
      periodTotalPieces,
      availableMonths,
      days,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/production
exports.createOrUpdateProduction = async (req, res) => {
  try {
    const { date, hourNumber, pieces, notes = '', hourTime, shiftStartTime } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required (YYYY-MM-DD)' });
    }
    const parsedHour = Number(hourNumber);
    if (!parsedHour || parsedHour < 1 || parsedHour > 8) {
      return res.status(400).json({ success: false, message: 'Hour number must be between 1 and 8' });
    }
    if (pieces === undefined || pieces === null || isNaN(pieces) || Number(pieces) < 0) {
      return res.status(400).json({ success: false, message: 'Pieces produced must be 0 or greater' });
    }

    // Determine the slot time label based on DailyShift or provided start time
    let slotTimeLabel = hourTime;
    if (!slotTimeLabel) {
      let dailyShift = await DailyShift.findOne({ date });
      let start = shiftStartTime || (dailyShift ? dailyShift.startTime : '08:00');
      const shiftInfo = computeShiftTimeDetails(start, 8);
      const slot = shiftInfo.slots.find((s) => s.hourNumber === parsedHour);
      slotTimeLabel = slot ? slot.hourTime : `Hour ${parsedHour}`;
    }

    const record = await Production.findOneAndUpdate(
      { date, hourNumber: parsedHour },
      {
        date,
        hourNumber: parsedHour,
        hourTime: slotTimeLabel,
        pieces: Number(pieces),
        notes: notes ? notes.trim() : '',
      },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    // Calculate updated total for the date
    const allRecords = await Production.find({ date });
    const dayTotal = allRecords.reduce((sum, r) => sum + r.pieces, 0);

    res.status(200).json({
      success: true,
      message: `Production for Hour ${parsedHour} (${slotTimeLabel}) saved successfully`,
      data: record,
      dayTotal,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/production/:id
exports.updateProduction = async (req, res) => {
  try {
    const { id } = req.params;
    const { pieces, notes } = req.body;

    const record = await Production.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Production entry not found' });
    }

    if (pieces !== undefined) {
      if (isNaN(pieces) || Number(pieces) < 0) {
        return res.status(400).json({ success: false, message: 'Pieces must be 0 or greater' });
      }
      record.pieces = Number(pieces);
    }

    if (notes !== undefined) {
      record.notes = notes.trim();
    }

    await record.save();

    // Calculate updated total for the date
    const allRecords = await Production.find({ date: record.date });
    const dayTotal = allRecords.reduce((sum, r) => sum + r.pieces, 0);

    res.json({
      success: true,
      message: 'Production entry updated successfully',
      data: record,
      dayTotal,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/production/:id
exports.deleteProduction = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Production.findByIdAndDelete(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Production entry not found' });
    }

    // Calculate updated total for the date
    const allRecords = await Production.find({ date: record.date });
    const dayTotal = allRecords.reduce((sum, r) => sum + r.pieces, 0);

    res.json({
      success: true,
      message: 'Production entry deleted successfully',
      dayTotal,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/production/day/:date
exports.deleteDayProduction = async (req, res) => {
  try {
    const { date } = req.params;
    const result = await Production.deleteMany({ date });
    await DailyShift.deleteOne({ date });
    res.json({
      success: true,
      message: `All production records and shift settings for ${date} deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export utility functions for unit testing
exports._testUtils = {
  computeShiftTimeDetails,
  computeShiftMetrics,
  normalizeTime,
};
