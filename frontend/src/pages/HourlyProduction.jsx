import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function HourlyProduction({
  selectedDate,
  productionRecords = [],
  slots = [],
  settings,
  onSaveSlot,
  onDeleteRecord,
  loading,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [slotNumber, setSlotNumber] = useState(1);
  const [itemType, setItemType] = useState(settings?.defaultDieType || '6-inch Wrinkle Dona');
  const [totalPieces, setTotalPieces] = useState('');
  const [rejectedPieces, setRejectedPieces] = useState('0');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Calculate live numbers
  const total = Number(totalPieces) || 0;
  const rejected = Number(rejectedPieces) || 0;
  const accepted = Math.max(0, total - rejected);
  const scrapRate = total > 0 ? ((rejected / total) * 100).toFixed(2) : 0;

  // Selected slot object
  const currentSlot = slots.find((s) => s.slotNumber === Number(slotNumber)) || {
    slotNumber: 1,
    slotTime: '08:00 - 09:00',
  };

  const handleOpenAdd = (targetSlotNumber = null) => {
    setEditingId(null);
    setFormError('');
    if (targetSlotNumber) {
      setSlotNumber(targetSlotNumber);
    } else {
      // Find first unlogged slot
      const loggedSlotNums = new Set(productionRecords.map((r) => r.slotNumber));
      const firstUnlogged = slots.find((s) => !loggedSlotNums.has(s.slotNumber));
      setSlotNumber(firstUnlogged ? firstUnlogged.slotNumber : 1);
    }
    setItemType(settings?.defaultDieType || '6-inch Wrinkle Dona');
    setTotalPieces('');
    setRejectedPieces('0');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record) => {
    setEditingId(record._id);
    setFormError('');
    setSlotNumber(record.slotNumber);
    setItemType(record.itemType || '6-inch Wrinkle Dona');
    setTotalPieces(String(record.totalPieces));
    setRejectedPieces(String(record.rejectedPieces));
    setNotes(record.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (total <= 0) {
      setFormError('Total pieces produced must be greater than 0.');
      return;
    }
    if (rejected < 0) {
      setFormError('Rejected pieces cannot be negative.');
      return;
    }
    if (rejected > total) {
      setFormError('Rejected pieces cannot exceed total produced pieces.');
      return;
    }

    const payload = {
      date: selectedDate,
      slotNumber: Number(slotNumber),
      slotTime: currentSlot.slotTime,
      itemType,
      totalPieces: total,
      rejectedPieces: rejected,
      notes,
    };

    try {
      await onSaveSlot(payload, editingId);
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save production record');
    }
  };

  // Day totals
  const totalDayProduced = productionRecords.reduce((sum, r) => sum + r.totalPieces, 0);
  const totalDayAccepted = productionRecords.reduce((sum, r) => sum + r.acceptedPieces, 0);
  const totalDayRejected = productionRecords.reduce((sum, r) => sum + r.rejectedPieces, 0);
  const dayScrapRate =
    totalDayProduced > 0
      ? ((totalDayRejected / totalDayProduced) * 100).toFixed(2)
      : '0.00';

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
          <h2>Hourly Production Logs</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing records for <span className="mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>{selectedDate}</span> • Configured 8-hour shift
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => handleOpenAdd()}>
          <Plus size={16} /> Record Hourly Output
        </button>
      </div>

      {/* Summary Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Day Total Produced
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {totalDayProduced.toLocaleString()} pcs
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', borderColor: 'rgba(6, 182, 212, 0.3)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
            Day Accepted (Good)
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {totalDayAccepted.toLocaleString()} pcs
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', textTransform: 'uppercase' }}>
            Day Scrap / Rejects
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
            {totalDayRejected.toLocaleString()} pcs ({dayScrapRate}%)
          </div>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Shift Progress
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {productionRecords.length} / {slots.length} Slots
          </div>
        </div>
      </div>

      {/* Production Records Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Clock size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span>Shift Slot Breakdown ({selectedDate})</span>
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Accepted = Total Produced - Rejected Pieces
          </span>
        </div>

        {productionRecords.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No Production Logged for this Date"
            description="Start recording pieces produced during each hour of the 8-hour shift."
            actionLabel="Record Slot 1"
            onAction={() => handleOpenAdd(1)}
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Slot #</th>
                  <th>Hour Time Slot</th>
                  <th>Product / Die Type</th>
                  <th style={{ textAlign: 'right' }}>Total Pieces</th>
                  <th style={{ textAlign: 'right' }}>Accepted (Good)</th>
                  <th style={{ textAlign: 'right' }}>Scrap / Rejects</th>
                  <th style={{ textAlign: 'right' }}>Scrap Rate</th>
                  <th>Operator Notes</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {productionRecords.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <span className="slot-badge">Slot {r.slotNumber}</span>
                    </td>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {r.slotTime}
                    </td>
                    <td>{r.itemType}</td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                      {r.totalPieces.toLocaleString()}
                    </td>
                    <td
                      className="mono"
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: 'var(--accent-cyan)',
                      }}
                    >
                      {r.acceptedPieces.toLocaleString()}
                    </td>
                    <td
                      className="mono"
                      style={{
                        textAlign: 'right',
                        color: r.rejectedPieces > 0 ? 'var(--accent-rose)' : 'var(--text-muted)',
                      }}
                    >
                      {r.rejectedPieces.toLocaleString()}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      <span
                        className={`badge-pill ${
                          r.scrapRate > 4 ? 'danger' : r.scrapRate > 0 ? 'warning' : 'success'
                        }`}
                      >
                        {r.scrapRate}%
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {r.notes || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(r)}
                          title="Edit hourly record"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => onDeleteRecord(r._id)}
                          title="Delete record"
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

      {/* Production Entry / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                {editingId ? 'Edit Hourly Production' : 'Record Hourly Production'}
              </h3>
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
                    <label className="form-label">Shift Slot</label>
                    <select
                      className="form-select"
                      value={slotNumber}
                      onChange={(e) => setSlotNumber(Number(e.target.value))}
                      disabled={!!editingId}
                    >
                      {slots.map((s) => (
                        <option key={s.slotNumber} value={s.slotNumber}>
                          Slot {s.slotNumber}: {s.slotTime}
                        </option>
                      ))}
                    </select>
                    <span className="form-hint">
                      Slot duration: 1 hour ({currentSlot.slotTime})
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Dona / Pattal Die Type</label>
                    <select
                      className="form-select"
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value)}
                    >
                      <option value="6-inch Wrinkle Dona">6-inch Wrinkle Dona</option>
                      <option value="7-inch Silver Dona">7-inch Silver Dona</option>
                      <option value="8-inch Deep Dona">8-inch Deep Dona</option>
                      <option value="12-inch Buffet Pattal">12-inch Buffet Pattal</option>
                      <option value="14-inch Partition Plate">14-inch Partition Plate</option>
                      <option value="Custom Die Spec">Custom Spec</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Total Produced Pieces</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="form-input mono"
                      placeholder="e.g. 1250"
                      value={totalPieces}
                      onChange={(e) => setTotalPieces(e.target.value)}
                      required
                    />
                    <span className="form-hint">Gross counter or tray count</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Rejected / Defective Pieces</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="form-input mono"
                      placeholder="e.g. 25"
                      value={rejectedPieces}
                      onChange={(e) => setRejectedPieces(e.target.value)}
                      required
                    />
                    <span className="form-hint">Torn, folded, or weak press</span>
                  </div>
                </div>

                {/* Auto Calculated Preview Card */}
                <div
                  style={{
                    backgroundColor: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Auto Calculated Net Accepted:
                    </div>
                    <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {accepted.toLocaleString()} pcs
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Scrap Rate:
                    </div>
                    <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 600, color: rejected > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                      {scrapRate}%
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Operator Notes (Optional)</label>
                  <textarea
                    rows="2"
                    className="form-textarea"
                    placeholder="e.g. Changed paper roll (120 GSM Silver), die heater temperature set to 140°C"
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
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={16} /> Save Slot Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
