const Expense = require('../models/Expense');
const DailySales = require('../models/DailySales');

// Helper to format date YYYY-MM-DD
const formatDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// GET /api/expenses?date=...&startDate=...&endDate=...&category=...
exports.getExpenses = async (req, res) => {
  try {
    const { date, startDate, endDate, category } = req.query;
    let query = {};

    if (date) {
      query.date = date;
    } else if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (category && category !== 'All Categories') {
      query.category = category;
    }

    const records = await Expense.find(query).sort({ date: -1, createdAt: -1 });

    // Calculate Today, This Week (last 7 days), and This Month totals
    const now = new Date();
    const todayStr = formatDate(now);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const weekStartStr = formatDate(sevenDaysAgo);

    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const allExpenses = await Expense.find({});

    let todayTotal = 0;
    let thisWeekTotal = 0;
    let thisMonthTotal = 0;
    const categoryTotals = {};

    // Initialize all 7 categories with 0
    Expense.CATEGORIES.forEach((cat) => {
      categoryTotals[cat] = 0;
    });

    allExpenses.forEach((item) => {
      if (item.date === todayStr) {
        todayTotal += item.amount;
      }
      if (item.date >= weekStartStr && item.date <= todayStr) {
        thisWeekTotal += item.amount;
      }
      if (item.date >= monthStartStr && item.date <= todayStr) {
        thisMonthTotal += item.amount;
      }
      if (categoryTotals[item.category] !== undefined) {
        categoryTotals[item.category] += item.amount;
      } else {
        categoryTotals[item.category] = item.amount;
      }
    });

    // Total of currently queried/filtered list
    const filteredTotal = records.reduce((sum, item) => sum + item.amount, 0);

    // Fetch daily sales revenue for the requested date (or today) if available
    const targetDate = date || todayStr;
    const salesRecord = await DailySales.findOne({ date: targetDate });
    const actualRevenue = salesRecord ? salesRecord.revenue : 0;
    const hasRevenueRecorded = !!salesRecord && salesRecord.revenue > 0;

    // Calculate profit only if revenue was actually recorded
    const estimatedProfit = hasRevenueRecorded ? (actualRevenue - todayTotal) : null;

    res.json({
      success: true,
      count: records.length,
      data: records,
      categories: Expense.CATEGORIES,
      summary: {
        filteredTotal,
        todayTotal,
        thisWeekTotal,
        thisMonthTotal,
        categoryTotals,
        actualRevenue,
        hasRevenueRecorded,
        estimatedProfit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/expenses
exports.createExpense = async (req, res) => {
  try {
    const { date, category, amount, description } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Expense date is required' });
    }
    if (!category) {
      return res.status(400).json({ success: false, message: 'Expense category is required' });
    }
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Description is required' });
    }

    const record = await Expense.create({
      date,
      category,
      amount: parsedAmount,
      description: description.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      data: record,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/expenses/:id
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, category, amount, description } = req.body;

    const record = await Expense.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    if (date) record.date = date;
    if (category) record.category = category;
    if (amount !== undefined) {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
      }
      record.amount = parsedAmount;
    }
    if (description !== undefined) {
      if (!description.trim()) {
        return res.status(400).json({ success: false, message: 'Description cannot be empty' });
      }
      record.description = description.trim();
    }

    await record.save();

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: record,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/expenses/:id
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Expense.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/expenses/revenue?date=YYYY-MM-DD
exports.getSalesRevenue = async (req, res) => {
  try {
    const date = req.query.date || formatDate(new Date());
    const sales = await DailySales.findOne({ date });
    res.json({
      success: true,
      date,
      revenue: sales ? sales.revenue : 0,
      hasRecorded: !!sales && sales.revenue > 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/expenses/revenue
exports.saveSalesRevenue = async (req, res) => {
  try {
    const { date, revenue, notes } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }
    const parsedRev = Number(revenue);
    if (isNaN(parsedRev) || parsedRev < 0) {
      return res.status(400).json({ success: false, message: 'Revenue must be 0 or greater' });
    }

    const sales = await DailySales.findOneAndUpdate(
      { date },
      { date, revenue: parsedRev, notes: notes || '' },
      { returnDocument: 'after', upsert: true }
    );

    res.json({
      success: true,
      message: 'Sales revenue saved successfully',
      data: sales,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
