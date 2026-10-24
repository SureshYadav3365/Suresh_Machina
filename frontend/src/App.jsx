import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Clock,
  Receipt,
  TrendingUp,
  Calendar,
  CalendarRange,
  Award,
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Settings as SettingsIcon,
  LayoutDashboard,
  History,
  Wallet,
} from 'lucide-react';
import { api } from './api';
import ExpensesPage from './pages/ExpensesPage';
import ProductionHistoryPage from './pages/ProductionHistoryPage';
import AnimatedNumber from './components/AnimatedNumber';

export default function App() {
  // Navigation: 'dashboard' | 'history' | 'expenses'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Today's date YYYY-MM-DD
  const getTodayDate = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [hoursData, setHoursData] = useState([]);
  
  // Production totals
  const [todayPieces, setTodayPieces] = useState(0);
  const [monthlyPieces, setMonthlyPieces] = useState(0);
  const [allTimePieces, setAllTimePieces] = useState(0);
  const [currentMonthLabel, setCurrentMonthLabel] = useState('');

  const [completedHours, setCompletedHours] = useState(0);
  const [averagePerHour, setAveragePerHour] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [actualRevenue, setActualRevenue] = useState(0);
  const [hasRevenueRecorded, setHasRevenueRecorded] = useState(false);
  const [estimatedProfit, setEstimatedProfit] = useState(null);
  const [loading, setLoading] = useState(true);

  // Revenue editing inline state
  const [isEditingRevenue, setIsEditingRevenue] = useState(false);
  const [revenueInput, setRevenueInput] = useState('');

  // Production Form State
  const [hourNumber, setHourNumber] = useState(1);
  const [pieces, setPieces] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Load data for selected date
  const loadData = useCallback(async (date) => {
    setLoading(true);
    try {
      const res = await api.getProduction(date);
      if (res.success) {
        setHoursData(res.hours || []);
        setTodayPieces(res.todayPieces || res.totalPieces || 0);
        setMonthlyPieces(res.monthlyPieces || 0);
        setAllTimePieces(res.allTimePieces || 0);
        setCurrentMonthLabel(res.currentMonthLabel || '');
        setCompletedHours(res.completedHours || 0);
        setAveragePerHour(res.averagePerHour || 0);
        setTodayExpenses(res.todayExpenses || 0);
        setActualRevenue(res.actualRevenue || 0);
        setHasRevenueRecorded(res.hasRevenueRecorded || false);
        setEstimatedProfit(res.estimatedProfit !== undefined ? res.estimatedProfit : null);

        // If not editing, default next hour to first unrecorded slot
        const firstUnrecorded = (res.hours || []).find((h) => !h.isRecorded);
        if (firstUnrecorded && !editingId) {
          setHourNumber(firstUnrecorded.hourNumber);
        }
      }
    } catch (err) {
      console.error('Error loading production:', err);
      showMessage('Failed to connect to backend server. Make sure MongoDB and backend are running.', 'error');
    } finally {
      setLoading(false);
    }
  }, [editingId]);

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate, loadData]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3500);
  };

  // Submit Hourly Production Form
  const handleSubmitProduction = async (e) => {
    e.preventDefault();

    if (pieces === '' || isNaN(pieces) || Number(pieces) < 0) {
      showMessage('Please enter a valid number of pieces (0 or more).', 'error');
      return;
    }

    const currentSlot = hoursData.find((h) => h.hourNumber === Number(hourNumber));
    const payload = {
      date: selectedDate,
      hourNumber: Number(hourNumber),
      hourTime: currentSlot ? currentSlot.hourTime : `Hour ${hourNumber}`,
      pieces: Number(pieces),
      notes: notes.trim(),
    };

    try {
      if (editingId) {
        await api.updateProduction(editingId, payload);
        showMessage(`Hour ${hourNumber} production updated successfully!`, 'success');
        setEditingId(null);
      } else {
        await api.saveProduction(payload);
        showMessage(`Hour ${hourNumber} count saved successfully!`, 'success');
      }

      setPieces('');
      setNotes('');
      await loadData(selectedDate);
    } catch (err) {
      showMessage(err.message || 'Error saving production record', 'error');
    }
  };

  const handleEditProduction = (slot) => {
    setEditingId(slot.id);
    setHourNumber(slot.hourNumber);
    setPieces(slot.pieces > 0 ? String(slot.pieces) : '0');
    setNotes(slot.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditProduction = () => {
    setEditingId(null);
    setPieces('');
    setNotes('');
    const firstUnrecorded = hoursData.find((h) => !h.isRecorded);
    if (firstUnrecorded) {
      setHourNumber(firstUnrecorded.hourNumber);
    }
  };

  const handleDeleteProduction = async (id, slotNum) => {
    if (!window.confirm(`Are you sure you want to delete the entry for Hour ${slotNum}?`)) {
      return;
    }

    try {
      await api.deleteProduction(id);
      showMessage(`Hour ${slotNum} entry deleted.`, 'info');
      if (editingId === id) {
        handleCancelEditProduction();
      }
      await loadData(selectedDate);
    } catch (err) {
      showMessage(err.message || 'Error deleting record', 'error');
    }
  };

  // Save Actual Sales Revenue for the Day
  const handleSaveRevenue = async (e) => {
    e.preventDefault();
    const val = Number(revenueInput);
    if (isNaN(val) || val < 0) {
      showMessage('Please enter a valid non-negative revenue amount.', 'error');
      return;
    }

    try {
      await api.saveSalesRevenue({
        date: selectedDate,
        revenue: val,
      });
      showMessage("Today's actual sales revenue saved!", 'success');
      setIsEditingRevenue(false);
      setRevenueInput('');
      await loadData(selectedDate);
    } catch (err) {
      showMessage(err.message || 'Failed to save sales revenue', 'error');
    }
  };

  // Handler when user clicks "Open on Dashboard" from History tab
  const handleSelectDateFromHistory = (date) => {
    setSelectedDate(date);
    setActiveTab('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Format month name nicely (e.g. October 2026)
  const formatMonthName = (mStr) => {
    if (!mStr) return 'Current Month';
    const [y, m] = mStr.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const shiftProgressPercent = Math.min(100, Math.round((completedHours / 8) * 100));

  return (
    <div className="layout-wrapper">
      {/* 1. Premium Animated Industrial Background (Grid, Glow Orbs, Floating Particles) */}
      <div className="industrial-bg-fx" aria-hidden="true">
        <div className="circuit-grid-overlay" />
        <div className="ambient-glow orb-cyan" />
        <div className="ambient-glow orb-blue" />
        <div className="ambient-glow orb-violet" />
        <div className="particles-layer">
          <span className="particle p1" />
          <span className="particle p2" />
          <span className="particle p3" />
          <span className="particle p4" />
          <span className="particle p5" />
          <span className="particle p6" />
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo-icon">
            <SettingsIcon size={20} className="spin-slow" />
          </div>
          <div>
            <div className="brand-name">MACHINA</div>
            <div className="brand-desc">Paper Dona & Pattal Unit</div>
          </div>
        </div>

        <nav className="sidebar-menu">
          <button
            className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Production Dashboard</span>
          </button>

          <button
            className={`nav-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={18} />
            <span>Production History</span>
          </button>

          <button
            className={`nav-button ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('expenses')}
          >
            <Wallet size={18} />
            <span>Expenses Management</span>
          </button>
        </nav>

        <div className="sidebar-foot">
          <div className="connection-pill">
            <span className="status-dot"></span>
            <span>MongoDB Connected</span>
          </div>
          <div className="shift-standard-note">Standard 8-Hour Shift</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content-panel">
        <div className="container">
          {/* Top Header Bar */}
          <header className="header">
            <div>
              <h1 className="title">
                {activeTab === 'dashboard' && 'Paper Dona / Pattal Machine Monitor'}
                {activeTab === 'history' && 'Daily Production History & Records'}
                {activeTab === 'expenses' && 'Manufacturing Expenses Management'}
              </h1>
              <p className="subtitle">
                {activeTab === 'dashboard' && 'Live 8-hour shift production tracking & automatic output totals'}
                {activeTab === 'history' && 'Date-wise manufacturing logs, period totals, and 8-hour drilldowns'}
                {activeTab === 'expenses' && 'Track raw materials, electricity, packaging, labor & repairs in Indian Rupees (₹)'}
              </p>
            </div>

            {/* Date Selector (for dashboard or active day) */}
            {activeTab === 'dashboard' && (
              <div className="date-box">
                <Calendar size={16} className="date-icon" />
                <label htmlFor="datePicker" className="date-label">
                  Date:
                </label>
                <input
                  id="datePicker"
                  type="date"
                  className="date-input"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    handleCancelEditProduction();
                    setIsEditingRevenue(false);
                  }}
                />
              </div>
            )}
          </header>

          {/* Alert / Notification Banner */}
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

          {/* ================= TAB 1: PRODUCTION DASHBOARD ================= */}
          {activeTab === 'dashboard' && (
            <div>
              {/* 1. THREE SEPARATE PRODUCTION SUMMARY CARDS (Today, Monthly, All-Time) */}
              <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.25rem' }}>
                {/* 1. Today's Production */}
                <div className="summary-card card-production">
                  <div className="card-top">
                    <span className="summary-label">Today's Production</span>
                    <div className="card-icon-wrap icon-production">
                      <Layers size={18} />
                    </div>
                  </div>
                  <div className="summary-value value-production">
                    <AnimatedNumber value={todayPieces} suffix=" pcs" />
                  </div>
                  <div className="card-bottom">
                    <span className="badge-tag tag-production">{completedHours}/8 Hours Logged</span>
                    <span className="card-subtext">Output for {selectedDate}</span>
                  </div>
                </div>

                {/* 2. Monthly Production */}
                <div className="summary-card card-month">
                  <div className="card-top">
                    <span className="summary-label">Monthly Production</span>
                    <div className="card-icon-wrap icon-month">
                      <CalendarRange size={18} />
                    </div>
                  </div>
                  <div className="summary-value value-month">
                    <AnimatedNumber value={monthlyPieces} suffix=" pcs" />
                  </div>
                  <div className="card-bottom">
                    <span className="badge-tag tag-month">Current Month</span>
                    <span className="card-subtext">{formatMonthName(currentMonthLabel)}</span>
                  </div>
                </div>

                {/* 3. All-Time Production */}
                <div className="summary-card card-alltime">
                  <div className="card-top">
                    <span className="summary-label">All-Time Production</span>
                    <div className="card-icon-wrap icon-alltime">
                      <Award size={18} />
                    </div>
                  </div>
                  <div className="summary-value value-alltime">
                    <AnimatedNumber value={allTimePieces} suffix=" pcs" />
                  </div>
                  <div className="card-bottom">
                    <span className="badge-tag tag-alltime">Total Lifetime Output</span>
                    <span className="card-subtext">Cumulative across all saved dates</span>
                  </div>
                </div>
              </div>

              {/* 2. OPERATIONAL & FINANCIAL CARDS (Shift Progress, Expenses, Profit) */}
              <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.75rem' }}>
                {/* Shift Hours Completed */}
                <div className="summary-card card-shift">
                  <div className="card-top">
                    <span className="summary-label">Shift Hours Progress</span>
                    <div className="card-icon-wrap icon-shift">
                      <Clock size={18} />
                    </div>
                  </div>
                  <div className="summary-value value-shift" style={{ fontSize: '1.65rem' }}>
                    {completedHours}/8 <span className="unit">hours completed</span>
                  </div>
                  <div className="card-progress-area">
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill fill-shift"
                        style={{ width: `${shiftProgressPercent}%` }}
                      />
                    </div>
                    <div className="progress-label-row">
                      <span>{shiftProgressPercent}% shift complete</span>
                      <span className="avg-speed-badge">
                        Avg: {averagePerHour.toLocaleString('en-IN')} pcs/hr
                      </span>
                    </div>
                  </div>
                </div>

                {/* Today's Total Expenses */}
                <div className="summary-card card-expenses">
                  <div className="card-top">
                    <span className="summary-label">Today's Total Expenses</span>
                    <div className="card-icon-wrap icon-expenses">
                      <Receipt size={18} />
                    </div>
                  </div>
                  <div className="summary-value value-expenses" style={{ fontSize: '1.65rem' }}>
                    <AnimatedNumber value={todayExpenses} prefix="₹" />
                  </div>
                  <div className="card-bottom card-bottom-actions">
                    <span className="card-subtext">Operating costs for {selectedDate}</span>
                    <button
                      className="btn-card-action btn-expenses-action"
                      onClick={() => setActiveTab('expenses')}
                    >
                      View or Add Expenses <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Estimated Net Profit */}
                <div className="summary-card card-profit">
                  <div className="card-top">
                    <span className="summary-label">Estimated Net Profit</span>
                    <div className="card-icon-wrap icon-profit">
                      <TrendingUp size={18} />
                    </div>
                  </div>

                  {hasRevenueRecorded ? (
                    <>
                      <div
                        className="summary-value value-profit"
                        style={{
                          fontSize: '1.65rem',
                          color: estimatedProfit >= 0 ? '#34d399' : '#fb7185',
                        }}
                      >
                        <AnimatedNumber
                          value={Math.abs(estimatedProfit)}
                          prefix={estimatedProfit >= 0 ? '+₹' : '-₹'}
                        />
                      </div>
                      <div className="card-bottom card-bottom-actions">
                        <span className="card-subtext">
                          Rev ₹{actualRevenue.toLocaleString('en-IN')} − Exp ₹{todayExpenses.toLocaleString('en-IN')}
                        </span>
                        <button
                          className="btn-card-action btn-profit-action"
                          onClick={() => {
                            setRevenueInput(String(actualRevenue));
                            setIsEditingRevenue(true);
                          }}
                        >
                          Edit Revenue
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="summary-value value-not-recorded" style={{ fontSize: '1.4rem' }}>
                        Not Recorded
                      </div>
                      <div className="card-bottom card-bottom-actions">
                        <span className="card-subtext">Requires sales revenue</span>
                        <button
                          className="btn-card-action btn-profit-action"
                          onClick={() => {
                            setRevenueInput('');
                            setIsEditingRevenue(true);
                          }}
                        >
                          + Enter Sales Revenue
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Enter Actual Sales Revenue Box (When toggled) */}
              {isEditingRevenue && (
                <div className="card revenue-input-box">
                  <div className="revenue-box-header">
                    <h3 className="revenue-box-title">
                      Enter Actual Sales Revenue for {selectedDate}
                    </h3>
                    <span className="revenue-box-desc">
                      Net Profit = <strong>Actual Sales Revenue − Recorded Expenses</strong>. Only enter verified customer sales figures.
                    </span>
                  </div>

                  <form onSubmit={handleSaveRevenue} className="revenue-form-row">
                    <div className="form-group flex-1">
                      <label className="label">Today's Sales Revenue (₹):</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 15000"
                        className="input number-input"
                        value={revenueInput}
                        onChange={(e) => setRevenueInput(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="revenue-btn-group">
                      <button type="submit" className="btn btn-primary">
                        Save Revenue
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setIsEditingRevenue(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Hourly Production Entry Form */}
              <section className="card form-section">
                <div className="section-header-row">
                  <h2 className="section-title">
                    {editingId ? `Edit Hour ${hourNumber} Record` : 'Record Hourly Output'}
                  </h2>
                  <span className="section-subtitle-tag">
                    Slot: {hoursData.find((h) => h.hourNumber === hourNumber)?.hourTime || `Hour ${hourNumber}`}
                  </span>
                </div>

                <form onSubmit={handleSubmitProduction} className="entry-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="label">Shift Hour Slot (1 to 8):</label>
                      <select
                        className="input select"
                        value={hourNumber}
                        onChange={(e) => setHourNumber(Number(e.target.value))}
                        disabled={!!editingId}
                      >
                        {hoursData.map((h) => (
                          <option key={h.hourNumber} value={h.hourNumber}>
                            Hour {h.hourNumber} ({h.hourTime}) {h.isRecorded ? '✓ Logged' : '— Pending'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="label">Pieces Produced (Dona / Pattal):</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 1250"
                        className="input number-input"
                        value={pieces}
                        onChange={(e) => setPieces(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label">Operator Remarks / Roll Info (Optional):</label>
                    <input
                      type="text"
                      placeholder="e.g. 120 GSM Silver Roll loaded, heater temperature 140°C"
                      className="input text-input"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      {editingId ? 'Update Hour Record' : 'Save Hourly Production'}
                    </button>

                    {editingId && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleCancelEditProduction}
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </section>

              {/* 8 Hourly Entries Table */}
              <section className="card table-section">
                <div className="table-header-row">
                  <div>
                    <h2 className="section-title" style={{ marginBottom: '2px' }}>
                      8-Hour Shift Production Records
                    </h2>
                    <span className="table-header-sub">
                      Scheduled shift: 08:00 to 16:00 • 8 One-hour production slots
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="date-indicator">Date: {selectedDate}</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveTab('history')}
                    >
                      View All Dates History →
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="loading-state">Loading production records...</div>
                ) : (
                  <div className="table-responsive">
                    <table className="production-table">
                      <thead>
                        <tr>
                          <th>Shift Hour</th>
                          <th>Time Slot</th>
                          <th style={{ textAlign: 'right' }}>Pieces Produced</th>
                          <th>Status</th>
                          <th>Notes</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hoursData.map((slot) => (
                          <tr
                            key={slot.hourNumber}
                            className={slot.isRecorded ? 'row-logged' : 'row-pending'}
                          >
                            <td>
                              <span className="hour-badge">Hour {slot.hourNumber}</span>
                            </td>
                            <td className="time-slot">{slot.hourTime}</td>
                            <td className="pieces-cell">
                              {slot.isRecorded ? (
                                <span className="pieces-value">
                                  {slot.pieces.toLocaleString('en-IN')} pcs
                                </span>
                              ) : (
                                <span className="pieces-pending">—</span>
                              )}
                            </td>
                            <td>
                              {slot.isRecorded ? (
                                <span className="status-badge status-logged">
                                  <CheckCircle2 size={12} /> Logged
                                </span>
                              ) : (
                                <span className="status-badge status-pending">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="notes-cell">
                              {slot.notes || <span className="empty-text">—</span>}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {slot.isRecorded ? (
                                <div className="action-buttons">
                                  <button
                                    className="btn-action btn-edit"
                                    onClick={() => handleEditProduction(slot)}
                                    title="Edit this entry"
                                  >
                                    <Edit2 size={12} /> Edit
                                  </button>
                                  <button
                                    className="btn-action btn-delete"
                                    onClick={() => handleDeleteProduction(slot.id, slot.hourNumber)}
                                    title="Delete this entry"
                                  >
                                    <Trash2 size={12} /> Delete
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="btn-action btn-enter"
                                  onClick={() => {
                                    setHourNumber(slot.hourNumber);
                                    setEditingId(null);
                                    setPieces('');
                                    setNotes('');
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                >
                                  + Record
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="total-row">
                          <td colSpan="2" className="total-label">
                            Total Daily Production:
                          </td>
                          <td className="total-pieces">
                            <AnimatedNumber value={todayPieces} suffix=" pcs" />
                          </td>
                          <td colSpan="3" className="total-note">
                            {completedHours} of 8 hours logged ({shiftProgressPercent}% shift complete)
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ================= TAB 2: PRODUCTION HISTORY ================= */}
          {activeTab === 'history' && (
            <ProductionHistoryPage
              onSelectDateForDashboard={handleSelectDateFromHistory}
              onProductionChange={() => loadData(selectedDate)}
            />
          )}

          {/* ================= TAB 3: EXPENSES MANAGEMENT ================= */}
          {activeTab === 'expenses' && (
            <ExpensesPage onExpenseChange={() => loadData(selectedDate)} />
          )}

          {/* Simple Clean Footer */}
          <footer className="footer">
            Paper Dona & Pattal Machine Monitoring System • Production & Expense Ledger
          </footer>
        </div>
      </main>
    </div>
  );
}
