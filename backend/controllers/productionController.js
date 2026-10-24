const Production = require('../models/Production');
const Expense = require('../models/Expense');
const DailySales = require('../models/DailySales');

// Standard 8 hourly shift slots
const STANDARD_HOURS = [
  { hourNumber: 1, hourTime: '08:00 - 09:00' },
  { hourNumber: 2, hourTime: '09:00 - 10:00' },
  { hourNumber: 3, hourTime: '10:00 - 11:00' },
  { hourNumber: 4, hourTime: '11:00 - 12:00' },
  { hourNumber: 5, hourTime: '12:00 - 13:00' },
  { hourNumber: 6, hourTime: '13:00 - 14:00' },
  { hourNumber: 7, hourTime: '14:00 - 15:00' },
  { hourNumber: 8, hourTime: '15:00 - 16:00' },
];

// Helper to get today's date string YYYY-MM-DD in local time
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

    // 1. Find all entries for this specific date
    const records = await Production.find({ date }).sort({ hourNumber: 1 });

    // Map records by hourNumber
    const recordMap = {};
    let totalPieces = 0;
    records.forEach((r) => {
      recordMap[r.hourNumber] = r;
      totalPieces += r.pieces;
    });

    // Build complete 8-hour view
    const hours = STANDARD_HOURS.map((slot) => {
      const rec = recordMap[slot.hourNumber];
      return {
        hourNumber: slot.hourNumber,
        hourTime: slot.hourTime,
        pieces: rec ? rec.pieces : 0,
        isRecorded: !!rec,
        notes: rec ? rec.notes : '',
        id: rec ? rec._id : null,
      };
    });

    const completedHours = records.length;
    const averagePerHour =
      completedHours > 0 ? Math.round(totalPieces / completedHours) : 0;

    // 2. Calculate Monthly Production (current calendar month based on selected date or current month)
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyAgg = await Production.aggregate([
      { $match: { date: { $regex: `^${currentMonthPrefix}` } } },
      { $group: { _id: null, total: { $sum: '$pieces' } } },
    ]);
    const monthlyPieces = monthlyAgg.length > 0 ? monthlyAgg[0].total : 0;

    // 3. Calculate All-Time Production (sum of all recorded dates since tracking began)
    const allTimeAgg = await Production.aggregate([
      { $group: { _id: null, total: { $sum: '$pieces' } } },
    ]);
    const allTimePieces = allTimeAgg.length > 0 ? allTimeAgg[0].total : 0;

    // 4. Fetch today's expenses and sales revenue for dashboard integration
    const dayExpenses = await Expense.find({ date });
    const todayExpenses = dayExpenses.reduce((sum, item) => sum + item.amount, 0);

    const salesRecord = await DailySales.findOne({ date });
    const actualRevenue = salesRecord ? salesRecord.revenue : 0;
    const hasRevenueRecorded = !!salesRecord && salesRecord.revenue > 0;
    const estimatedProfit = hasRevenueRecorded ? (actualRevenue - todayExpenses) : null;

    res.json({
      success: true,
      date,
      totalPieces,       // Today's production
      todayPieces: totalPieces,
      monthlyPieces,     // Current month's production
      allTimePieces,     // All-time production
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

    const days = dayGroups.map((d) => ({
      date: d._id,
      totalPieces: d.totalPieces,
      hoursCount: d.hoursCount,
      averagePerHour: d.hoursCount > 0 ? Math.round(d.totalPieces / d.hoursCount) : 0,
      records: d.records.sort((a, b) => a.hourNumber - b.hourNumber),
    }));

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
    const { date, hourNumber, pieces, notes = '', hourTime } = req.body;

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

    const standardSlot = STANDARD_HOURS.find((s) => s.hourNumber === parsedHour);
    const slotTimeLabel = hourTime || (standardSlot ? standardSlot.hourTime : `Hour ${parsedHour}`);

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
    res.json({
      success: true,
      message: `All production records for ${date} deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
