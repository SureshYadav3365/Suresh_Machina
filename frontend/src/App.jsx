import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Clock,
  Receipt,
  TrendingUp,
  Calendar,
  CalendarRange,
  Award,
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

  // Dynamic Shift Time Management
  const [shiftStartTime, setShiftStartTime] = useState('08:00');
  const [shiftEndTime, setShiftEndTime] = useState('16:00');
  const [shiftHours, setShiftHours] = useState(8);
  const [shiftStatus, setShiftStatus] = useState('upcoming'); // 'upcoming' | 'ongoing' | 'completed'
  const [shiftElapsedFormatted, setShiftElapsedFormatted] = useState('0m');
  const [shiftRemainingFormatted, setShiftRemainingFormatted] = useState('8h 0m');
  const [shiftProgressPercent, setShiftProgressPercent] = useState(0);
  const [currentSlotNumber, setCurrentSlotNumber] = useState(null);
  const [isUpdatingShiftTime, setIsUpdatingShiftTime] = useState(false);

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

        // Shift Timing Details
        setShiftStartTime(res.shiftStartTime || '08:00');
        setShiftEndTime(res.shiftEndTime || '16:00');
        setShiftHours(res.shiftHours || 8);
        setShiftStatus(res.shiftStatus || 'upcoming');
        setShiftElapsedFormatted(res.shiftElapsedFormatted || '0m');
        setShiftRemainingFormatted(res.shiftRemainingFormatted || '8h 0m');
        setShiftProgressPercent(res.shiftProgressPercent !== undefined ? res.shiftProgressPercent : 0);
        setCurrentSlotNumber(res.currentSlotNumber || null);

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

  // Periodic refresh (every 30s) to keep shift timing & active hour live
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeTab === 'dashboard' && selectedDate) {
        loadData(selectedDate);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [activeTab, selectedDate, loadData]);

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
      shiftStartTime,
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

  const loggedHoursPercent = Math.min(100, Math.round((completedHours / 8) * 100));

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
          <div className="shift-standard-note">Configurable 8-Hour Shift</div>
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
              {/* SHIFT TIME MANAGEMENT & COCKPIT CONTROLS */}
              <div className="shift-control-bar">
                <div className="shift-control-col">
                  <span className="shift-badge-title">
                    <Clock size={14} className="clock-icon-cyan" />
                    Actual Machine Shift Time
                  </span>
                  <div className="shift-time-picker-wrapper">
                    <div className="time-picker-input-group">
                      <label htmlFor="shiftStartInput" className="shift-time-label">
                        Shift Start:
                      </label>
                      <input
                        id="shiftStartInput"
                        type="time"
                        className="time-picker-input"
                        value={shiftStartTime}
                        onChange={async (e) => {
                          const val = e.target.value;
                          if (!val) return;
                          setShiftStartTime(val);
                          try {
                            const res = await api.setDailyShift({
                              date: selectedDate,
                              startTime: val,
                              shiftHours: 8,
                            });
                            if (res.success) {
                              showMessage(`Shift start time set to ${val} (8-hour shift ends at ${res.shiftEndTime})`, 'success');
                              await loadData(selectedDate);
                            }
                          } catch (err) {
                            showMessage(err.message || 'Failed to update shift start time', 'error');
                          }
                        }}
                        title="Select or enter the actual time your machine started working today"
                      />
                    </div>
                    <div className="shift-window-pill">
                      <span className="pill-muted">Calculated 8-Hr End:</span>
                      <span className="pill-highlight">{shiftEndTime}</span>
                    </div>
                  </div>
                </div>

                <div className="shift-status-metrics-col">
                  <div className="shift-metric-box">
                    <span className="metric-micro-label">Shift Status</span>
                    <span className={`shift-status-tag tag-${shiftStatus}`}>
                      {shiftStatus === 'ongoing' && <span className="pulse-indicator-cyan" />}
                      {shiftStatus === 'ongoing' ? 'In Progress' : shiftStatus === 'completed' ? 'Shift Finished' : 'Upcoming'}
                    </span>
                  </div>

                  <div className="shift-metric-box">
                    <span className="metric-micro-label">Elapsed Time</span>
                    <span className="metric-time-value">{shiftElapsedFormatted}</span>
                  </div>

                  <div className="shift-metric-box">
                    <span className="metric-micro-label">Remaining Time</span>
                    <span className="metric-time-value value-cyan">{shiftRemainingFormatted}</span>
                  </div>

                  <div className="shift-metric-box">
                    <span className="metric-micro-label">Active Working Slot</span>
                    <div className="metric-time-value">
                      {currentSlotNumber ? (
                        <span className="slot-active-tag">Hour {currentSlotNumber} ({hoursData.find((h) => h.hourNumber === currentSlotNumber)?.hourTime})</span>
                      ) : (
                        <span className="slot-idle-tag">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* UNIFIED 6-CARD METRICS GRID */}
              <div className="dashboard-metrics-grid">
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

                {/* 2. Shift Hours Completed */}
                <div className="summary-card card-shift">
                  <div className="card-top">
                    <span className="summary-label">Shift Hours Completed</span>
                    <div className="card-icon-wrap icon-shift">
                      <Clock size={18} />
                    </div>
                  </div>
                  <div>
                    <div className="summary-value value-shift">
                      {completedHours}/8 <span className="unit">hours</span>
                    </div>
                    <div className="progress-bar-bg" style={{ marginTop: '0.2rem', marginBottom: '0.35rem' }}>
                      <div
                        className="progress-bar-fill fill-shift"
                        style={{ width: `${shiftProgressPercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="card-bottom">
                    <span className="badge-tag tag-shift">
                      {shiftStatus === 'ongoing'
                        ? `${shiftElapsedFormatted} elapsed`
                        : shiftStatus === 'completed'
                        ? 'Shift Finished'
                        : 'Shift Upcoming'}
                    </span>
                    <span className="card-subtext">
                      Avg: {averagePerHour.toLocaleString('en-IN')} pcs/hr
                    </span>
                  </div>
                </div>

                {/* 3. Today's Total Expenses */}
                <div className="summary-card card-expenses">
                  <div className="card-top">
                    <span className="summary-label">Today's Total Expenses</span>
                    <div className="card-icon-wrap icon-expenses">
                      <Receipt size={18} />
                    </div>
                  </div>
                  <div className="summary-value value-expenses">
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

                {/* 4. Estimated Net Profit */}
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
                      <div className="summary-value value-not-recorded">
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

                {/* 5. Monthly Production */}
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

                {/* 6. All-Time Production */}
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
                    <span className="badge-tag tag-alltime">Lifetime Output</span>
                    <span className="card-subtext">Cumulative across all dates</span>
                  </div>
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

              {/* Redesigned Hourly Production Entry Form */}
              <section className="card form-section">
                <div className="section-header-row">
                  <div>
                    <h2 className="section-title">
                      {editingId ? `Update Hour ${hourNumber} Production` : 'Record Hourly Output'}
                    </h2>
                    <span className="card-subtext" style={{ display: 'block', marginTop: '2px' }}>
                      {editingId ? 'Modify existing piece count and operator roll notes' : 'Enter finished paper dona / pattal counts for this shift slot'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span className="section-subtitle-tag">
                      Date: {selectedDate} • Hour {hourNumber} ({hoursData.find((h) => h.hourNumber === hourNumber)?.hourTime || `Hour ${hourNumber}`})
                    </span>
                    {editingId && (
                      <span className="badge-tag" style={{ background: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                        Editing Mode
                      </span>
                    )}
                  </div>
                </div>

                {/* 8-Hour Interactive Slot Selector Strip */}
                <div className="hour-slot-picker-container">
                  <div className="slot-picker-label">
                    <span>Quick Select 8-Hour Slot:</span>
                    <span className="label-hint">Click any slot to record or edit</span>
                  </div>
                  <div className="hour-slot-grid">
                    {hoursData.map((h) => {
                      const isSelected = h.hourNumber === hourNumber;
                      const isLogged = h.isRecorded;
                      const isActiveNow = h.timeStatus === 'ongoing';
                      return (
                        <div
                          key={h.hourNumber}
                          className={`slot-chip ${isSelected ? 'selected' : ''} ${isLogged ? 'is-logged' : 'is-pending'} ${isActiveNow ? 'is-active-now' : ''}`}
                          onClick={() => {
                            if (editingId && editingId !== h.id) {
                              setEditingId(null);
                            }
                            setHourNumber(h.hourNumber);
                            if (h.isRecorded) {
                              handleEditProduction(h);
                            } else {
                              setPieces('');
                              setNotes('');
                            }
                          }}
                          title={`Hour ${h.hourNumber} (${h.hourTime}) - ${isLogged ? `${h.pieces} pcs recorded` : 'Pending'}`}
                        >
                          <span className="slot-chip-num">Hour {h.hourNumber}</span>
                          <span className="slot-chip-time">{h.hourTime}</span>
                          <span className="slot-chip-status">
                            {isActiveNow && <span className="pulse-indicator-cyan" />}
                            {isLogged ? `✓ ${h.pieces.toLocaleString('en-IN')} pcs` : isActiveNow ? 'Active Now' : 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleSubmitProduction} className="entry-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="label" htmlFor="hourSelector">
                        <span>Selected Shift Hour:</span>
                        <span className="label-hint">8 hourly shift divisions</span>
                      </label>
                      <select
                        id="hourSelector"
                        className="input select"
                        value={hourNumber}
                        onChange={(e) => {
                          const slotNum = Number(e.target.value);
                          setHourNumber(slotNum);
                          const matching = hoursData.find((h) => h.hourNumber === slotNum);
                          if (matching && matching.isRecorded) {
                            handleEditProduction(matching);
                          } else {
                            if (editingId) setEditingId(null);
                            setPieces('');
                            setNotes('');
                          }
                        }}
                      >
                        {hoursData.map((h) => {
                          const timeLabel = h.timeStatus === 'ongoing' ? '● Active Now' : h.timeStatus === 'completed' ? 'Passed' : 'Upcoming';
                          const recLabel = h.isRecorded ? `✓ Logged (${h.pieces} pcs)` : 'Pending';
                          return (
                            <option key={h.hourNumber} value={h.hourNumber}>
                              Hour {h.hourNumber} ({h.hourTime}) — [{timeLabel}] [{recLabel}]
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="label" htmlFor="piecesInput">
                        <span>Pieces Produced (Dona / Pattal):</span>
                        <span className="label-hint">Finished units</span>
                      </label>
                      <div className="input-with-badge">
                        <input
                          id="piecesInput"
                          type="number"
                          min="0"
                          step="1"
                          placeholder="e.g. 1250"
                          className="input number-input"
                          value={pieces}
                          onChange={(e) => setPieces(e.target.value)}
                          required
                        />
                        <span className="input-badge">pcs</span>
                      </div>
                      {/* Ergonomic Quick Addition Chips for Operator Convenience */}
                      <div className="quick-add-group">
                        <span className="label-hint" style={{ marginRight: '4px' }}>Quick Add:</span>
                        {[100, 250, 500, 1000].map((delta) => (
                          <button
                            key={delta}
                            type="button"
                            className="quick-add-btn"
                            onClick={() => {
                              const curr = Number(pieces) || 0;
                              setPieces(String(curr + delta));
                            }}
                          >
                            +{delta.toLocaleString('en-IN')}
                          </button>
                        ))}
                        {pieces && (
                          <button
                            type="button"
                            className="quick-add-btn quick-add-clear"
                            onClick={() => setPieces('')}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label" htmlFor="operatorNotes">
                      <span>Operator Remarks / Roll & Machine Info (Optional):</span>
                      <span className="label-hint">GSM, heater temperature, batch notes</span>
                    </label>
                    <input
                      id="operatorNotes"
                      type="text"
                      placeholder="e.g. 120 GSM Silver Roll loaded, heater temperature 140°C, die clean"
                      className="input text-input"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      <CheckCircle2 size={18} />
                      {editingId ? `Update Hour ${hourNumber} Production` : `Save Hour ${hourNumber} Production`}
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
                      Working Shift: <strong>{shiftStartTime} to {shiftEndTime}</strong> (8 Hours) • 8 One-hour production slots based on actual machine start time
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
                          <th>Shift Time Status</th>
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
                            className={`${slot.isRecorded ? 'row-logged' : 'row-pending'} ${slot.isOngoing ? 'row-ongoing' : ''}`}
                          >
                            <td>
                              <span className="hour-badge">Hour {slot.hourNumber}</span>
                            </td>
                            <td className="time-slot">{slot.hourTime}</td>
                            <td>
                              {slot.timeStatus === 'ongoing' && (
                                <span className="time-status-pill pill-ongoing">
                                  <span className="pulse-dot-cyan"></span> Ongoing
                                </span>
                              )}
                              {slot.timeStatus === 'completed' && (
                                <span className="time-status-pill pill-completed">
                                  <CheckCircle2 size={12} /> Completed
                                </span>
                              )}
                              {slot.timeStatus === 'upcoming' && (
                                <span className="time-status-pill pill-upcoming">
                                  <Clock size={12} /> Upcoming
                                </span>
                              )}
                            </td>
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
                          <td colSpan="3" className="total-label">
                            Total Daily Production:
                          </td>
                          <td className="total-pieces">
                            <AnimatedNumber value={todayPieces} suffix=" pcs" />
                          </td>
                          <td colSpan="3" className="total-note">
                            {completedHours} of 8 hours logged ({loggedHoursPercent}% logged)
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
