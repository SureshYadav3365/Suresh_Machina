import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Filter,
  Trash2,
  Edit2,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { api } from '../api';
import AnimatedNumber from '../components/AnimatedNumber';

export default function ProductionHistoryPage({ onSelectDateForDashboard, onProductionChange }) {
  const [historyData, setHistoryData] = useState({
    totalDays: 0,
    periodTotalPieces: 0,
    availableMonths: [],
    days: [],
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expanded day details: Map of date -> boolean
  const [expandedDates, setExpandedDates] = useState({});

  // Editing state for an hourly slot
  const [editingSlot, setEditingSlot] = useState(null);
  const [editPieces, setEditPieces] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3500);
  };

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedMonth && selectedMonth !== 'all') {
        params.month = selectedMonth;
      } else if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const res = await api.getProductionHistory(params);
      if (res.success) {
        setHistoryData(res);
        // Expand the most recent day by default if only a few days
        if (res.days.length > 0 && Object.keys(expandedDates).length === 0) {
          setExpandedDates({ [res.days[0].date]: true });
        }
      }
    } catch (err) {
      console.error('Error fetching production history:', err);
      showMessage('Could not load production history.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, startDate, endDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const toggleExpand = (date) => {
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  // Delete an entire day's production
  const handleDeleteDay = async (date) => {
    if (
      !window.confirm(
        `Are you sure you want to delete all production records for ${date}? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await api.deleteDayProduction(date);
      if (res.success) {
        showMessage(`All production entries for ${date} deleted.`, 'info');
        await fetchHistory();
        if (onProductionChange) onProductionChange();
      }
    } catch (err) {
      showMessage(err.message || 'Failed to delete day record', 'error');
    }
  };

  // Delete a single hourly record
  const handleDeleteSlot = async (id, hourNum, date) => {
    if (!window.confirm(`Delete entry for Hour ${hourNum} on ${date}?`)) {
      return;
    }

    try {
      const res = await api.deleteProduction(id);
      if (res.success) {
        showMessage(`Hour ${hourNum} record removed.`, 'info');
        await fetchHistory();
        if (onProductionChange) onProductionChange();
      }
    } catch (err) {
      showMessage(err.message || 'Failed to delete entry', 'error');
    }
  };

  // Open inline edit for a slot
  const handleStartEditSlot = (slot) => {
    setEditingSlot(slot);
    setEditPieces(String(slot.pieces));
    setEditNotes(slot.notes || '');
  };

  const handleSaveEditSlot = async (e) => {
    e.preventDefault();
    if (editPieces === '' || isNaN(editPieces) || Number(editPieces) < 0) {
      showMessage('Please enter a valid pieces count (0 or more).', 'error');
      return;
    }

    try {
      await api.updateProduction(editingSlot._id, {
        pieces: Number(editPieces),
        notes: editNotes.trim(),
      });
      showMessage(`Hour ${editingSlot.hourNumber} record updated!`, 'success');
      setEditingSlot(null);
      await fetchHistory();
      if (onProductionChange) onProductionChange();
    } catch (err) {
      showMessage(err.message || 'Failed to update record', 'error');
    }
  };

  // Format YYYY-MM-DD to readable date
  const formatReadableDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      weekday: 'short',
    });
  };

  const formatMonthLabel = (mStr) => {
    if (!mStr) return '';
    const [y, m] = mStr.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const days = historyData.days || [];
  const avgDaily =
    days.length > 0 ? Math.round(historyData.periodTotalPieces / days.length) : 0;

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

      {/* Production History Summary Cards */}
      <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="summary-card card-production">
          <div className="card-top">
            <span className="summary-label">Selected Period Production</span>
            <div className="card-icon-wrap icon-production">
              <Layers size={18} />
            </div>
          </div>
          <div className="summary-value value-production">
            <AnimatedNumber value={historyData.periodTotalPieces} suffix=" pcs" />
          </div>
          <div className="card-bottom">
            <span className="card-subtext">Sum of all records in filtered range</span>
          </div>
        </div>

        <div className="summary-card card-shift">
          <div className="card-top">
            <span className="summary-label">Production Days Recorded</span>
            <div className="card-icon-wrap icon-shift">
              <Calendar size={18} />
            </div>
          </div>
          <div className="summary-value value-shift">
            <AnimatedNumber value={historyData.totalDays} suffix={historyData.totalDays === 1 ? ' day' : ' days'} />
          </div>
          <div className="card-bottom">
            <span className="card-subtext">Dates with recorded output</span>
          </div>
        </div>

        <div className="summary-card card-profit">
          <div className="card-top">
            <span className="summary-label">Average Daily Output</span>
            <div className="card-icon-wrap icon-profit">
              <Clock size={18} />
            </div>
          </div>
          <div className="summary-value value-profit">
            <AnimatedNumber value={avgDaily} suffix=" pcs / day" />
          </div>
          <div className="card-bottom">
            <span className="card-subtext">Calculated across active recorded days</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <section className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <div className="history-filter-bar">
          <div className="filter-group">
            <Filter size={16} style={{ color: 'var(--color-blue)' }} />
            <label className="filter-label">Filter by Month:</label>
            <select
              className="input filter-select"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setStartDate('');
                setEndDate('');
              }}
            >
              <option value="all">All Recorded Months</option>
              {historyData.availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)} ({m})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-divider">or</div>

          <div className="filter-group">
            <label className="filter-label">From Date:</label>
            <input
              type="date"
              className="input filter-date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedMonth('all');
              }}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">To Date:</label>
            <input
              type="date"
              className="input filter-date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedMonth('all');
              }}
            />
          </div>

          {(selectedMonth !== 'all' || startDate || endDate) && (
            <button
              type="button"
              className="btn-clear-filter"
              onClick={() => {
                setSelectedMonth('all');
                setStartDate('');
                setEndDate('');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </section>

      {/* Date-wise Production History Cards & Tables */}
      <section className="card table-section">
        <div className="table-header-row">
          <div>
            <h3 className="section-title" style={{ marginBottom: '2px' }}>
              Daily Production Records Log
            </h3>
            <span className="table-header-sub">
              Expand any date to review its 8 hourly breakdown, edit piece counts, or delete entries
            </span>
          </div>
          <span className="date-indicator">
            {days.length} {days.length === 1 ? 'Date' : 'Dates'} Found
          </span>
        </div>

        {loading ? (
          <div className="loading-state">Loading production history...</div>
        ) : days.length === 0 ? (
          <div className="empty-state-simple">
            <FileText size={36} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1rem' }}>
              No production records found for the selected period.
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Select a different date range or record hourly production on the dashboard.
            </p>
          </div>
        ) : (
          <div className="history-days-list">
            {days.map((day) => {
              const isExpanded = !!expandedDates[day.date];
              return (
                <div key={day.date} className="history-day-card">
                  {/* Day Header Summary Row */}
                  <div
                    className="history-day-header"
                    onClick={() => toggleExpand(day.date)}
                  >
                    <div className="day-header-left">
                      <button
                        className="btn-toggle-expand"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(day.date);
                        }}
                        aria-label="Expand day details"
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <div>
                        <div className="day-date-title">
                          {formatReadableDate(day.date)}
                        </div>
                        <div className="day-date-code mono">{day.date}</div>
                      </div>
                    </div>

                    <div className="day-header-metrics">
                      <div className="day-metric-item">
                        <span className="metric-label">Total Produced:</span>
                        <span className="metric-value-total">
                          {day.totalPieces.toLocaleString('en-IN')} pcs
                        </span>
                      </div>

                      <div className="day-metric-item">
                        <span className="metric-label">Hours Logged:</span>
                        <span className="metric-value-badge">
                          {day.hoursCount}/8 hours
                        </span>
                      </div>

                      <div className="day-metric-item d-none-sm">
                        <span className="metric-label">Shift Window:</span>
                        <span className="metric-value-sub" style={{ color: 'var(--color-blue)' }}>
                          {day.shiftStartTime && day.shiftEndTime ? `${day.shiftStartTime} - ${day.shiftEndTime}` : '8 Hours'}
                        </span>
                      </div>

                      <div className="day-metric-item d-none-sm">
                        <span className="metric-label">Avg Speed:</span>
                        <span className="metric-value-sub">
                          {day.averagePerHour.toLocaleString('en-IN')} pcs/hr
                        </span>
                      </div>
                    </div>

                    <div
                      className="day-header-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="btn-action btn-dashboard-link"
                        onClick={() => onSelectDateForDashboard(day.date)}
                        title="Open this date on Live Dashboard to record or edit"
                      >
                        Open on Dashboard <ArrowRight size={13} />
                      </button>
                      <button
                        className="btn-action btn-delete"
                        onClick={() => handleDeleteDay(day.date)}
                        title="Delete entire day's records"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded 8 Hourly Slots Breakdown */}
                  {isExpanded && (
                    <div className="history-day-body">
                      <div className="slots-breakdown-title">
                        <span>8-Hour Shift Breakdown for {formatReadableDate(day.date)}</span>
                        <span className="slots-count-tag">
                          {day.records.length} of 8 hours completed
                        </span>
                      </div>

                      <div className="table-responsive">
                        <table className="production-table slot-subtable">
                          <thead>
                            <tr>
                              <th>Hour Slot</th>
                              <th>Time Window</th>
                              <th style={{ textAlign: 'right' }}>Pieces Produced</th>
                              <th>Operator Notes</th>
                              <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {day.records.map((slot) => (
                              <tr key={slot._id}>
                                <td>
                                  <span className="hour-badge">Hour {slot.hourNumber}</span>
                                </td>
                                <td className="time-slot">{slot.hourTime}</td>
                                <td className="pieces-cell">
                                  <span className="pieces-value">
                                    {slot.pieces.toLocaleString('en-IN')} pcs
                                  </span>
                                </td>
                                <td className="notes-cell">
                                  {slot.notes || <span className="empty-text">—</span>}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div className="action-buttons">
                                    <button
                                      className="btn-action btn-edit"
                                      onClick={() => handleStartEditSlot(slot)}
                                      title="Edit pieces for this hour"
                                    >
                                      <Edit2 size={12} /> Edit
                                    </button>
                                    <button
                                      className="btn-action btn-delete"
                                      onClick={() =>
                                        handleDeleteSlot(slot._id, slot.hourNumber, day.date)
                                      }
                                      title="Delete this hour's entry"
                                    >
                                      <Trash2 size={12} /> Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Inline Modal for Editing a Slot Record */}
      {editingSlot && (
        <div className="modal-overlay" onClick={() => setEditingSlot(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="section-title" style={{ margin: 0 }}>
                Edit Hour {editingSlot.hourNumber} Production
              </h3>
              <button
                className="btn-close-modal"
                onClick={() => setEditingSlot(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSlot}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Slot: <strong>{editingSlot.hourTime}</strong>
                </p>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="label">Pieces Produced (pcs):</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="input number-input"
                    value={editPieces}
                    onChange={(e) => setEditPieces(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="label">Notes / Remarks (Optional):</label>
                  <input
                    type="text"
                    className="input text-input"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingSlot(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
