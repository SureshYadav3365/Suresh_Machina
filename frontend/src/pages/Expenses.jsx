import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  PieChart,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function Expenses({
  selectedDate,
  expenseRecords = [],
  currency = '₹',
  onSaveExpense,
  onDeleteExpense,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [category, setCategory] = useState('Raw Material (Paper Roll / Film)');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [formError, setFormError] = useState('');

  const categories = [
    'Raw Material (Paper Roll / Film)',
    'Electricity & Power',
    'Packaging (Boxes, Plastic, Tape)',
    'Labor & Wages',
    'Machine Spares & Oil',
    'Transportation & Fuel',
    'Other / Miscellaneous',
  ];

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormError('');
    setCategory('Raw Material (Paper Roll / Film)');
    setAmount('');
    setDescription('');
    setPaymentMode('Cash');
    setInvoiceNumber('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec) => {
    setEditingId(rec._id);
    setFormError('');
    setCategory(rec.category);
    setAmount(String(rec.amount));
    setDescription(rec.description);
    setPaymentMode(rec.paymentMode || 'Cash');
    setInvoiceNumber(rec.invoiceNumber || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const parsedAmount = Number(amount);
    if (!amount || parsedAmount <= 0) {
      setFormError('Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!description.trim()) {
      setFormError('Description is required.');
      return;
    }

    const payload = {
      date: selectedDate,
      category,
      amount: parsedAmount,
      description: description.trim(),
      paymentMode,
      invoiceNumber: invoiceNumber.trim(),
    };

    try {
      await onSaveExpense(payload, editingId);
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save expense');
    }
  };

  const totalAmount = expenseRecords.reduce((sum, item) => sum + (item.amount || 0), 0);

  // Category breakdown
  const categoryBreakdown = expenseRecords.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {});

  return (
    <div>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2>Operational Expenses & Spares</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Record paper rolls, electricity, packing, and machine maintenance costs for <span className="mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>{selectedDate}</span>
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Record Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1rem', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', textTransform: 'uppercase' }}>
            Total Recorded Expenses
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {currency}{totalAmount.toLocaleString()}
          </div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Expense Transactions
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {expenseRecords.length} Items
          </div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Active Categories
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {Object.keys(categoryBreakdown).length} Types
          </div>
        </div>
      </div>

      {/* Category Breakdown Bar */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">
              <PieChart size={18} style={{ color: 'var(--accent-indigo)' }} />
              <span>Expense Distribution by Category</span>
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {Object.entries(categoryBreakdown).map(([cat, amt]) => (
              <div key={cat} style={{ background: 'rgba(16, 24, 39, 0.5)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600 }}>{cat}</span>
                  <span className="mono" style={{ color: 'var(--text-main)' }}>{currency}{amt.toLocaleString()}</span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min((amt / totalAmount) * 100, 100)}%`,
                      background: 'var(--accent-indigo)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Receipt size={18} style={{ color: 'var(--accent-indigo)' }} />
            <span>Expense Item Records ({selectedDate})</span>
          </h3>
        </div>

        {expenseRecords.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No Expenses Logged for this Date"
            description="Record raw materials (paper roll kg), electricity, packaging boxes, or maintenance spares."
            actionLabel="Add Expense Item"
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Payment Mode</th>
                  <th>Invoice / Slip</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenseRecords.map((e) => (
                  <tr key={e._id}>
                    <td>
                      <span className="badge-pill info" style={{ fontWeight: 600 }}>
                        {e.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{e.description}</td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem' }}>
                      {currency}{e.amount.toLocaleString()}
                    </td>
                    <td>
                      <span className="badge-pill" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        {e.paymentMode}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {e.invoiceNumber || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(e)}
                          title="Edit expense"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => onDeleteExpense(e._id)}
                          title="Delete expense"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{editingId ? 'Edit Expense Record' : 'Record New Expense'}</h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(244, 63, 94, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      color: '#fb7185',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Expense Category</label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Amount ({currency})</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-input mono"
                      placeholder="e.g. 1500"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select
                      className="form-select"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI / Online">UPI / Online</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Credit / Due">Credit / Due</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Description / Particulars</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 120 kg silver foil kraft paper roll lot @ ₹65/kg"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Invoice / Receipt # (Optional)</label>
                  <input
                    type="text"
                    className="form-input mono"
                    placeholder="e.g. BILL-4912"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={16} /> Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
