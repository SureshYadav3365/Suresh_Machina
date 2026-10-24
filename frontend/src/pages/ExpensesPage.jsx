import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Calendar,
  Filter,
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api';
import AnimatedNumber from '../components/AnimatedNumber';

const CATEGORIES = [
  'Electricity Bill',
  'Worker/Labour Wages',
  'Packaging Materials',
  'Raw Materials',
  'Machine Repair and Maintenance',
  'Transportation',
  'Other Expenses',
];

export default function ExpensesPage({ onExpenseChange }) {
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({
    todayTotal: 0,
    thisWeekTotal: 0,
    thisMonthTotal: 0,
    filteredTotal: 0,
    categoryTotals: {},
  });
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [filterDate, setFilterDate] = useState('');

  // Form State
  const [date, setDate] = useState(getTodayStr());
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory && filterCategory !== 'All Categories') {
        params.category = filterCategory;
      }
      if (filterDate) {
        params.date = filterDate;
      }

      const res = await api.getExpenses(params);
      if (res.success) {
        setExpenses(res.data || []);
        setSummary(res.summary || {
          todayTotal: 0,
          thisWeekTotal: 0,
          thisMonthTotal: 0,
          filteredTotal: 0,
          categoryTotals: {},
        });
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      showMessage('Could not load expenses. Make sure backend is running.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterDate]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3500);
  };

  // Submit Expense Form
  const handleSubmit = async (e) => {
    e.preventDefault();

    const parsedAmount = Number(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      showMessage('Please enter an expense amount greater than 0.', 'error');
      return;
    }
    if (!description.trim()) {
      showMessage('Please enter an expense description.', 'error');
      return;
    }

    const payload = {
      date,
      category,
      amount: parsedAmount,
      description: description.trim(),
    };

    try {
      if (editingId) {
        await api.updateExpense(editingId, payload);
        showMessage('Expense record updated successfully!', 'success');
        setEditingId(null);
      } else {
        await api.createExpense(payload);
        showMessage('Expense record added successfully!', 'success');
      }

      setAmount('');
      setDescription('');
      await fetchExpenses();
      if (onExpenseChange) onExpenseChange();
    } catch (err) {
      showMessage(err.message || 'Failed to save expense', 'error');
    }
  };

  // Edit Expense
  const handleEdit = (item) => {
    setEditingId(item._id);
    setDate(item.date);
    setCategory(item.category);
    setAmount(String(item.amount));
    setDescription(item.description);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel Edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setDate(getTodayStr());
    setCategory(CATEGORIES[0]);
    setAmount('');
    setDescription('');
  };

  // Delete Expense
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) {
      return;
    }

    try {
      await api.deleteExpense(id);
      showMessage('Expense record deleted successfully.', 'info');
      if (editingId === id) handleCancelEdit();
      await fetchExpenses();
      if (onExpenseChange) onExpenseChange();
    } catch (err) {
      showMessage(err.message || 'Failed to delete expense', 'error');
    }
  };

  const categoryTotals = summary.categoryTotals || {};
  const grandTotal = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* Alert Banner */}
      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? (
            <CheckCircle2 size={18} className="alert-icon" />
          ) : (
            <AlertCircle size={18} className="alert-icon" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Period Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card card-expenses">
          <div className="card-top">
            <span className="summary-label">Today's Total Expenses</span>
            <div className="card-icon-wrap icon-expenses">
              <Receipt size={18} />
            </div>
          </div>
          <div className="summary-value value-expenses">
            <AnimatedNumber value={summary.todayTotal} prefix="₹" />
          </div>
          <div className="card-bottom">
            <span className="card-subtext">Direct manufacturing expenses today</span>
          </div>
        </div>

        <div className="summary-card card-shift">
          <div className="card-top">
            <span className="summary-label">This Week's Expenses</span>
            <div className="card-icon-wrap icon-shift">
              <Calendar size={18} />
            </div>
          </div>
          <div className="summary-value value-shift">
            <AnimatedNumber value={summary.thisWeekTotal} prefix="₹" />
          </div>
          <div className="card-bottom">
            <span className="card-subtext">Last 7 days operational expenditure</span>
          </div>
        </div>

        <div className="summary-card card-production">
          <div className="card-top">
            <span className="summary-label">This Month's Expenses</span>
            <div className="card-icon-wrap icon-production">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="summary-value value-production">
            <AnimatedNumber value={summary.thisMonthTotal} prefix="₹" />
          </div>
          <div className="card-bottom">
            <span className="card-subtext">Current month expenditure ledger</span>
          </div>
        </div>
      </div>

      {/* Category-wise Expense Summary */}
      <section className="card">
        <div className="section-header-row">
          <h3 className="section-title">Category-wise Expense Summary</h3>
          <span className="section-subtitle-tag">
            Total Recorded: ₹{grandTotal.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="category-summary-grid">
          {CATEGORIES.map((cat) => {
            const catAmt = categoryTotals[cat] || 0;
            const percent = grandTotal > 0 ? Math.round((catAmt / grandTotal) * 100) : 0;
            return (
              <div key={cat} className="category-summary-box">
                <div className="category-box-header">
                  <span className="category-name">{cat}</span>
                  <span className="category-amount">₹{catAmt.toLocaleString('en-IN')}</span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill fill-category"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="category-percent">{percent}% of recorded expenses</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add / Edit Expense Form */}
      <section className="card form-section">
        <div className="section-header-row">
          <h3 className="section-title">
            {editingId ? 'Edit Expense Record' : 'Record Operating Expense'}
          </h3>
          <span className="section-subtitle-tag">
            All amounts recorded in Indian Rupees (₹)
          </span>
        </div>

        <form onSubmit={handleSubmit} className="entry-form">
          <div className="form-row">
            <div className="form-group">
              <label className="label">Expense Date:</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Expense Category:</label>
              <select
                className="input select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Amount in Indian Rupees (₹):</label>
              <input
                type="number"
                min="0.01"
                step="any"
                placeholder="e.g. 4500"
                className="input number-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Description / Particulars:</label>
              <input
                type="text"
                placeholder="e.g. 150 kg Kraft paper roll lot @ ₹65/kg"
                className="input text-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update Expense' : 'Save Expense Record'}
            </button>

            {editingId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelEdit}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Filter and Expenses Table */}
      <section className="card table-section">
        <div className="table-header-row">
          <div>
            <h3 className="section-title" style={{ marginBottom: '2px' }}>
              Expenses Log Entries
            </h3>
            <span className="table-header-sub">
              Filter by category or inspect specific manufacturing dates
            </span>
          </div>

          {/* Filter Controls */}
          <div className="filter-controls">
            <div className="filter-group">
              <label className="filter-label">Category:</label>
              <select
                className="input filter-select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="All Categories">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Date:</label>
              <input
                type="date"
                className="input filter-date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
              {filterDate && (
                <button
                  type="button"
                  className="btn-clear-filter"
                  onClick={() => setFilterDate('')}
                  title="Clear date filter"
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="empty-state-simple">
            <p>No expense records found matching the filter.</p>
            {(filterCategory !== 'All Categories' || filterDate) && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '0.65rem' }}
                onClick={() => {
                  setFilterCategory('All Categories');
                  setFilterDate('');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="production-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((item) => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 600 }}>{item.date}</td>
                    <td>
                      <span className="category-pill">{item.category}</span>
                    </td>
                    <td>{item.description}</td>
                    <td className="pieces-cell">
                      <span className="expense-amount">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-buttons">
                        <button
                          className="btn-action btn-edit"
                          onClick={() => handleEdit(item)}
                          title="Edit this expense"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          className="btn-action btn-delete"
                          onClick={() => handleDelete(item._id)}
                          title="Delete this expense"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan="3" className="total-label">
                    Total Filtered Expenses:
                  </td>
                  <td className="total-pieces" style={{ color: '#dc2626' }}>
                    ₹{summary.filteredTotal.toLocaleString('en-IN')}
                  </td>
                  <td className="total-note">
                    {expenses.length} records listed
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
