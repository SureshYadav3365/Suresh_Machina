import React, { useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Wrench,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function DowntimeLogs({
  selectedDate,
  downtimeRecords = [],
  summary = {},
  onSaveDowntime,
  onDeleteDowntime,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:30');
  const [reason, setReason] = useState('Paper Roll Change');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Reason presets tailored for dona/pattal manufacturing
  const reasonsList = [
    'Paper Roll Change',
    'Die Jam / Paper Tear',
    'Die Temperature / Heating Issue',
    'Hydraulic / Punching Mechanism',
    'Power Outage / Low Voltage',
    'Lubrication & Daily Maintenance',
    'Operator Lunch / Rest Break',
    'Die Changeover',
    'Other / Unscheduled',
  ];

  // Helper to compute live duration
  const getLiveDuration = () => {
    if (!startTime || !endTime) return 0;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    let sTot = sH * 60 + sM;
    let eTot = eH * 60 + eM;
    if (eTot < sTot) eTot += 24 * 60;
    return eTot - sTot;
  };

  const liveMinutes = getLiveDuration();

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormError('');
    setStartTime('10:00');
    setEndTime('10:20');
    setReason('Paper Roll Change');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record) => {
    setEditingId(record._id);
    setFormError('');
    setStartTime(record.startTime);
    setEndTime(record.endTime);
    setReason(record.reason);
    setNotes(record.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (liveMinutes <= 0) {
      setFormError('End time must be after start time.');
      return;
    }

    const payload = {
      date: selectedDate,
      startTime,
      endTime,
      durationMinutes: liveMinutes,
      reason,
      notes,
    };

    try {
      await onSaveDowntime(payload, editingId);
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save stoppage record');
    }
  };

  const totalMinutes = downtimeRecords.reduce((sum, d) => sum + (d.durationMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Group by reason
  const reasonsMap = downtimeRecords.reduce((acc, curr) => {
    acc[curr.reason] = (acc[curr.reason] || 0) + curr.durationMinutes;
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
          <h2>Machine Downtime & Stoppage Logs</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Track machine breakdown, paper roll changeovers, and idle time for <span className="mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>{selectedDate}</span>
          </p>
        </div>

        <button className="btn btn-warning" onClick={handleOpenAdd}>
          <Plus size={16} /> Log Stoppage
        </button>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1rem', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
            Total Downtime
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
            {totalMinutes} mins <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>({totalHours}h)</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Stoppage Incidents
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {downtimeRecords.length} Events
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', textTransform: 'uppercase' }}>
            Effective Operating Time
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
            {Math.max(0, 480 - totalMinutes)} mins <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>({((Math.max(0, 480 - totalMinutes) / 480) * 100).toFixed(0)}%)</span>
          </div>
        </div>
      </div>

      {/* Reasons breakdown bar */}
      {Object.keys(reasonsMap).length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">
              <Wrench size={18} style={{ color: 'var(--accent-amber)' }} />
              <span>Downtime Duration by Stoppage Cause</span>
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {Object.entries(reasonsMap).map(([rs, mins]) => (
              <div key={rs} style={{ background: 'rgba(16, 24, 39, 0.5)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600 }}>{rs}</span>
                  <span className="mono" style={{ color: 'var(--accent-amber)' }}>{mins}m ({((mins / totalMinutes) * 100).toFixed(0)}%)</span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min((mins / totalMinutes) * 100, 100)}%`,
                      background: 'var(--accent-amber)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stoppages Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Clock size={18} style={{ color: 'var(--accent-amber)' }} />
            <span>Stoppage Log Entries ({selectedDate})</span>
          </h3>
        </div>

        {downtimeRecords.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No Machine Stoppages Logged"
            description="Machine operated with zero recorded interruptions, or downtime has not been entered yet."
            actionLabel="Log a Stoppage"
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th style={{ textAlign: 'right' }}>Duration</th>
                  <th>Reason for Stoppage</th>
                  <th>Observations / Root Cause</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {downtimeRecords.map((d) => (
                  <tr key={d._id}>
                    <td className="mono" style={{ fontWeight: 600 }}>{d.startTime}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{d.endTime}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      <span className="badge-pill warning mono" style={{ fontSize: '0.82rem' }}>
                        {d.durationMinutes} mins
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#fcd34d' }}>{d.reason}</span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {d.notes || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(d)}
                          title="Edit stoppage"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => onDeleteDowntime(d._id)}
                          title="Delete stoppage"
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
            style={{ maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{editingId ? 'Edit Stoppage Log' : 'Log Machine Stoppage'}</h3>
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

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Stoppage Start Time</label>
                    <input
                      type="time"
                      className="form-input mono"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Machine Resumed Time</label>
                    <input
                      type="time"
                      className="form-input mono"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Auto Calculated Duration Notice */}
                <div
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Calculated Stoppage Duration:
                  </span>
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-amber)', fontSize: '1.1rem' }}>
                    {liveMinutes} Minutes
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Reason for Stoppage</label>
                  <select
                    className="form-select"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  >
                    {reasonsList.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Observations / Root Cause (Optional)</label>
                  <textarea
                    rows="2"
                    className="form-textarea"
                    placeholder="e.g. Paper roll snapped at feed guide; cleaned roller glue residue"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
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
                <button type="submit" className="btn btn-warning">
                  <CheckCircle2 size={16} /> Save Stoppage Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
