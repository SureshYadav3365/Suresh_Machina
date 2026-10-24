const MachineSettings = require('../models/MachineSettings');
const Production = require('../models/Production');
const Downtime = require('../models/Downtime');
const Expense = require('../models/Expense');

// Utility to generate hourly slots from shift start time and total hours
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

// GET /api/settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await MachineSettings.findOne();
    if (!settings) {
      settings = await MachineSettings.create({});
    }
    const slots = generateSlots(settings.shiftStartTime, settings.shiftHours);
    res.json({
      success: true,
      data: settings,
      slots,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/settings
exports.updateSettings = async (req, res) => {
  try {
    let settings = await MachineSettings.findOne();
    if (!settings) {
      settings = new MachineSettings();
    }

    const {
      machineName,
      shiftStartTime,
      shiftHours,
      defaultDieType,
      hourlyTargetPieces,
      operatorName,
      currencySymbol,
    } = req.body;

    if (machineName !== undefined) settings.machineName = machineName;
    if (shiftStartTime !== undefined) settings.shiftStartTime = shiftStartTime;
    if (shiftHours !== undefined) settings.shiftHours = Number(shiftHours);
    if (defaultDieType !== undefined) settings.defaultDieType = defaultDieType;
    if (hourlyTargetPieces !== undefined) settings.hourlyTargetPieces = Number(hourlyTargetPieces);
    if (operatorName !== undefined) settings.operatorName = operatorName;
    if (currencySymbol !== undefined) settings.currencySymbol = currencySymbol;

    await settings.save();
    const slots = generateSlots(settings.shiftStartTime, settings.shiftHours);

    res.json({
      success: true,
      message: 'Machine and shift settings updated successfully',
      data: settings,
      slots,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// POST /api/settings/seed-demo (Only invoked when explicitly requested by user in UI)
exports.seedDemoData = async (req, res) => {
  try {
    let settings = await MachineSettings.findOne();
    if (!settings) {
      settings = await MachineSettings.create({});
    }
    const slots = generateSlots(settings.shiftStartTime, settings.shiftHours);

    // Clear existing data before seeding
    await Production.deleteMany({});
    await Downtime.deleteMany({});
    await Expense.deleteMany({});

    const today = new Date();
    const productionDocs = [];
    const downtimeDocs = [];
    const expenseDocs = [];

    const dieTypes = ['6-inch Wrinkle Dona', '7-inch Silver Dona', '12-inch Buffet Pattal'];
    const downtimeReasons = [
      'Paper Roll Change',
      'Die Jam / Paper Tear',
      'Die Temperature / Heating Issue',
      'Lubrication & Daily Maintenance',
      'Operator Lunch / Rest Break',
    ];

    // Seed 5 days of data up to today
    for (let dayOffset = 4; dayOffset >= 0; dayOffset--) {
      const d = new Date(today);
      d.setDate(d.getDate() - dayOffset);
      const dateStr = d.toISOString().split('T')[0];

      // Seed 8 slots for each day
      slots.forEach((slot, idx) => {
        // Base production around 1000 - 1400 pcs
        const isLunchBreakSlot = idx === 4; // Slot 5 lunch
        const total = isLunchBreakSlot ? 650 : Math.floor(1050 + Math.random() * 320);
        const rejected = Math.floor(15 + Math.random() * 45);
        const accepted = total - rejected;
        const scrapRate = Number(((rejected / total) * 100).toFixed(2));

        productionDocs.push({
          date: dateStr,
          slotNumber: slot.slotNumber,
          slotTime: slot.slotTime,
          itemType: dieTypes[idx % dieTypes.length],
          totalPieces: total,
          rejectedPieces: rejected,
          acceptedPieces: accepted,
          scrapRate,
          notes: idx === 1 ? 'New paper roll loaded (120 GSM)' : '',
        });
      });

      // Seed 1-2 downtime records per day
      downtimeDocs.push({
        date: dateStr,
        startTime: '10:45',
        endTime: '11:05',
        durationMinutes: 20,
        reason: 'Paper Roll Change',
        notes: 'Silver roll 120 GSM replaced and threaded',
      });

      if (dayOffset % 2 === 0) {
        downtimeDocs.push({
          date: dateStr,
          startTime: '13:00',
          endTime: '13:30',
          durationMinutes: 30,
          reason: 'Operator Lunch / Rest Break',
          notes: 'Standard shift meal break',
        });
      }

      // Seed expenses every few days
      if (dayOffset === 4) {
        expenseDocs.push({
          date: dateStr,
          category: 'Raw Material (Paper Roll / Film)',
          amount: 14500,
          paymentMode: 'Bank Transfer',
          description: '220 Kg Silver craft paper roll lot',
          invoiceNumber: 'INV-8821',
        });
      }
      if (dayOffset === 2) {
        expenseDocs.push({
          date: dateStr,
          category: 'Packaging (Boxes, Plastic, Tape)',
          amount: 1800,
          paymentMode: 'Cash',
          description: '50 Master cartons & packing tape rolls',
          invoiceNumber: 'CASH-091',
        });
      }
      if (dayOffset === 0) {
        expenseDocs.push({
          date: dateStr,
          category: 'Electricity & Power',
          amount: 2400,
          paymentMode: 'UPI / Online',
          description: 'Weekly machine power consumption estimate',
          invoiceNumber: 'EB-OCT-24',
        });
      }
    }

    await Production.insertMany(productionDocs);
    await Downtime.insertMany(downtimeDocs);
    await Expense.insertMany(expenseDocs);

    res.json({
      success: true,
      message: 'Demo production, downtime, and expense data loaded successfully (5 days).',
      counts: {
        production: productionDocs.length,
        downtime: downtimeDocs.length,
        expenses: expenseDocs.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/settings/clear-data
exports.clearAllData = async (req, res) => {
  try {
    await Production.deleteMany({});
    await Downtime.deleteMany({});
    await Expense.deleteMany({});
    res.json({
      success: true,
      message: 'All production, downtime, and expense records have been cleared.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
