const Production = require('../models/Production');
const Downtime = require('../models/Downtime');
const Expense = require('../models/Expense');
const MachineSettings = require('../models/MachineSettings');

// Helper to generate slots
const generateSlots = (startTimeStr = '08:00', totalHours = 8) => {
  const slots = [];
  const [startH, startM] = startTimeStr.split(':').map(Number);
  
  for (let i = 0; i < totalHours; i++) {
    const slotStartTotalMinutes = (startH * 60 + startM + i * 60) % (24 * 60);
    const slotEndTotalMinutes = (slotStartTotalMinutes + 60) % (24 * 60);

    const formatTime = (minutes) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const startFormatted = formatTime(slotStartTotalMinutes);
    const endFormatted = formatTime(slotEndTotalMinutes);

    slots.push({
      slotNumber: i + 1,
      slotTime: `${startFormatted} - ${endFormatted}`,
      startTime: startFormatted,
      endTime: endFormatted,
    });
  }
  return slots;
};

// GET /api/reports/dashboard?date=YYYY-MM-DD
exports.getDashboardData = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // 1. Fetch settings
    let settings = await MachineSettings.findOne();
    if (!settings) {
      settings = await MachineSettings.create({});
    }

    const slots = generateSlots(settings.shiftStartTime, settings.shiftHours);
    const totalShiftMinutes = settings.shiftHours * 60;

    // 2. Fetch today's production records
    const productionRecords = await Production.find({ date }).sort({ slotNumber: 1 });

    // 3. Fetch today's downtime
    const downtimeRecords = await Downtime.find({ date }).sort({ startTime: 1 });

    // 4. Fetch today's expenses
    const expenseRecords = await Expense.find({ date }).sort({ createdAt: -1 });

    // Production calculations
    let totalPieces = 0;
    let acceptedPieces = 0;
    let rejectedPieces = 0;

    // Map records to slots
    const slotDataMap = {};
    productionRecords.forEach((rec) => {
      slotDataMap[rec.slotNumber] = rec;
      totalPieces += rec.totalPieces;
      acceptedPieces += rec.acceptedPieces;
      rejectedPieces += rec.rejectedPieces;
    });

    const scrapRate =
      totalPieces > 0 ? Number(((rejectedPieces / totalPieces) * 100).toFixed(2)) : 0;

    // Build complete hourly slot status list
    const hourlyTimeline = slots.map((slot) => {
      const rec = slotDataMap[slot.slotNumber];
      return {
        slotNumber: slot.slotNumber,
        slotTime: slot.slotTime,
        isRecorded: !!rec,
        totalPieces: rec ? rec.totalPieces : 0,
        acceptedPieces: rec ? rec.acceptedPieces : 0,
        rejectedPieces: rec ? rec.rejectedPieces : 0,
        scrapRate: rec ? rec.scrapRate : 0,
        itemType: rec ? rec.itemType : settings.defaultDieType,
        notes: rec ? rec.notes : '',
        id: rec ? rec._id : null,
      };
    });

    // Downtime calculations
    const totalDowntimeMinutes = downtimeRecords.reduce(
      (sum, d) => sum + (d.durationMinutes || 0),
      0
    );
    const totalDowntimeHours = Number((totalDowntimeMinutes / 60).toFixed(1));

    // Running time = totalShiftMinutes - downtimeMinutes (clamped >= 0)
    const runningTimeMinutes = Math.max(0, totalShiftMinutes - totalDowntimeMinutes);
    const runningTimeHours = Number((runningTimeMinutes / 60).toFixed(1));

    const machineAvailabilityRate =
      totalShiftMinutes > 0
        ? Number(((runningTimeMinutes / totalShiftMinutes) * 100).toFixed(1))
        : 100;

    // Downtime breakdown by reason
    const downtimeReasons = downtimeRecords.reduce((acc, curr) => {
      acc[curr.reason] = (acc[curr.reason] || 0) + curr.durationMinutes;
      return acc;
    }, {});

    // Expense calculations
    const totalExpenses = expenseRecords.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Target calculation
    const shiftTargetPieces = (settings.hourlyTargetPieces || 1200) * settings.shiftHours;
    const targetAchievementRate =
      shiftTargetPieces > 0
        ? Number(((acceptedPieces / shiftTargetPieces) * 100).toFixed(1))
        : 0;

    res.json({
      success: true,
      date,
      settings: {
        machineName: settings.machineName,
        shiftStartTime: settings.shiftStartTime,
        shiftHours: settings.shiftHours,
        hourlyTargetPieces: settings.hourlyTargetPieces,
        currencySymbol: settings.currencySymbol || '₹',
        defaultDieType: settings.defaultDieType,
      },
      summary: {
        totalPieces,
        acceptedPieces,
        rejectedPieces,
        scrapRate,
        slotsEntered: productionRecords.length,
        totalSlots: settings.shiftHours,
        totalDowntimeMinutes,
        totalDowntimeHours,
        runningTimeMinutes,
        runningTimeHours,
        machineAvailabilityRate,
        totalExpenses,
        shiftTargetPieces,
        targetAchievementRate,
      },
      hourlyTimeline,
      downtimeRecords,
      downtimeReasons,
      expenseRecords,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/analytics?period=daily|weekly|monthly|custom&startDate=...&endDate=...
exports.getAnalyticsReport = async (req, res) => {
  try {
    const { period = 'weekly', startDate, endDate } = req.query;
    let startStr, endStr;

    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (period === 'daily') {
      startStr = formatDate(today);
      endStr = formatDate(today);
    } else if (period === 'weekly') {
      const past7 = new Date(today);
      past7.setDate(past7.getDate() - 6);
      startStr = formatDate(past7);
      endStr = formatDate(today);
    } else if (period === 'monthly') {
      const past30 = new Date(today);
      past30.setDate(past30.getDate() - 29);
      startStr = formatDate(past30);
      endStr = formatDate(today);
    } else if (period === 'custom') {
      startStr = startDate || formatDate(today);
      endStr = endDate || formatDate(today);
    }

    // Query production, downtime, expenses in range
    const [productions, downtimes, expenses, settings] = await Promise.all([
      Production.find({ date: { $gte: startStr, $lte: endStr } }).sort({ date: 1, slotNumber: 1 }),
      Downtime.find({ date: { $gte: startStr, $lte: endStr } }).sort({ date: 1 }),
      Expense.find({ date: { $gte: startStr, $lte: endStr } }).sort({ date: 1 }),
      MachineSettings.findOne() || {},
    ]);

    // Aggregate by date
    const dateMap = {};

    // Helper to initialize date map entry
    const getOrInitDate = (d) => {
      if (!dateMap[d]) {
        dateMap[d] = {
          date: d,
          totalPieces: 0,
          acceptedPieces: 0,
          rejectedPieces: 0,
          scrapRate: 0,
          slotsCount: 0,
          downtimeMinutes: 0,
          expenses: 0,
        };
      }
      return dateMap[d];
    };

    productions.forEach((p) => {
      const entry = getOrInitDate(p.date);
      entry.totalPieces += p.totalPieces;
      entry.acceptedPieces += p.acceptedPieces;
      entry.rejectedPieces += p.rejectedPieces;
      entry.slotsCount += 1;
    });

    downtimes.forEach((d) => {
      const entry = getOrInitDate(d.date);
      entry.downtimeMinutes += d.durationMinutes || 0;
    });

    expenses.forEach((e) => {
      const entry = getOrInitDate(e.date);
      entry.expenses += e.amount || 0;
    });

    // Calculate rates per date
    const dailyBreakdown = Object.values(dateMap)
      .map((item) => {
        item.scrapRate =
          item.totalPieces > 0
            ? Number(((item.rejectedPieces / item.totalPieces) * 100).toFixed(2))
            : 0;
        item.downtimeHours = Number((item.downtimeMinutes / 60).toFixed(1));
        return item;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Global aggregations
    const overallTotalPieces = dailyBreakdown.reduce((s, i) => s + i.totalPieces, 0);
    const overallAcceptedPieces = dailyBreakdown.reduce((s, i) => s + i.acceptedPieces, 0);
    const overallRejectedPieces = dailyBreakdown.reduce((s, i) => s + i.rejectedPieces, 0);
    const overallDowntimeMinutes = dailyBreakdown.reduce((s, i) => s + i.downtimeMinutes, 0);
    const overallExpenses = dailyBreakdown.reduce((s, i) => s + i.expenses, 0);

    const overallScrapRate =
      overallTotalPieces > 0
        ? Number(((overallRejectedPieces / overallTotalPieces) * 100).toFixed(2))
        : 0;

    // Cost per 1000 pieces: (Total Expenses / Accepted Pieces) * 1000
    const costPer1000Pieces =
      overallAcceptedPieces > 0
        ? Number(((overallExpenses / overallAcceptedPieces) * 1000).toFixed(2))
        : 0;

    // Downtime reasons aggregate
    const downtimeReasonsAgg = downtimes.reduce((acc, curr) => {
      acc[curr.reason] = (acc[curr.reason] || 0) + curr.durationMinutes;
      return acc;
    }, {});

    // Expense categories aggregate
    const expenseCategoriesAgg = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {});

    res.json({
      success: true,
      period,
      startDate: startStr,
      endDate: endStr,
      summary: {
        totalPieces: overallTotalPieces,
        acceptedPieces: overallAcceptedPieces,
        rejectedPieces: overallRejectedPieces,
        scrapRate: overallScrapRate,
        totalDowntimeMinutes: overallDowntimeMinutes,
        totalDowntimeHours: Number((overallDowntimeMinutes / 60).toFixed(1)),
        totalExpenses: overallExpenses,
        costPer1000Pieces,
        currencySymbol: settings.currencySymbol || '₹',
        daysWithActivity: dailyBreakdown.length,
      },
      dailyBreakdown,
      downtimeReasons: downtimeReasonsAgg,
      expenseCategories: expenseCategoriesAgg,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
