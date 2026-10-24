const mongoose = require('mongoose');

const EXPENSE_CATEGORIES = [
  'Electricity Bill',
  'Worker/Labour Wages',
  'Packaging Materials',
  'Raw Materials',
  'Machine Repair and Maintenance',
  'Transportation',
  'Other Expenses',
];

const ExpenseSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: [true, 'Expense date is required'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      enum: {
        values: EXPENSE_CATEGORIES,
        message: '{VALUE} is not a valid expense category',
      },
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    description: {
      type: String,
      trim: true,
      required: [true, 'Expense description is required'],
    },
  },
  {
    timestamps: true,
  }
);

ExpenseSchema.statics.CATEGORIES = EXPENSE_CATEGORIES;

module.exports = mongoose.model('Expense', ExpenseSchema);
