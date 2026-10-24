import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Clock,
  Save,
  Database,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

export default function Settings({
  settings,
  slots = [],
  onUpdateSettings,
  onSeedDemoData,
  onClearData,
}) {
  const [machineName, setMachineName] = useState(settings?.machineName || '');
  const [shiftStartTime, setShiftStartTime] = useState(settings?.shiftStartTime || '08:00');
  const [hourlyTargetPieces, setHourlyTargetPieces] = useState(settings?.hourlyTargetPieces || 1200);
  const [defaultDieType, setDefaultDieType] = useState(settings?.defaultDieType || '6-inch Wrinkle Dona');
  const [operatorName, setOperatorName] = useState(settings?.operatorName || 'Primary Operator');
  const [currencySymbol, setCurrencySymbol] = useState(settings?.currencySymbol || '₹');

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isSeedConfirmOpen, setIsSeedConfirmOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setMachineName(settings.machineName || '');
      setShiftStartTime(settings.shiftStartTime || '08:00');
      setHourlyTargetPieces(settings.hourlyTargetPieces || 1200);
      setDefaultDieType(settings.defaultDieType || '6-inch Wrinkle Dona');
      setOperatorName(settings.operatorName || 'Primary Operator');
      setCurrencySymbol(settings.currencySymbol || '₹');
    }
  }, [settings]);

  // Preview generated slots from the current shiftStartTime
  const previewSlots = () => {
    const preview = [];
    const [startH, startM] = (shiftStartTime || '08:00').split(':').map(Number);
    for (let i = 0; i < 8; i++) {
      const sTotal = (startH * 60 + (startM || 0) + i * 60) % (24 * 60);
      const eTotal = (sTotal + 60) % (24 * 60);
      const fmt = (min) => {
        const h = Math.floor(min / 60);
        const m = min % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };
      preview.push({
        num: i + 1,
        time: `${fmt(sTotal)} - ${fmt(eTotal)}`,
      });
    }
    return preview;
  };

  const calculatedSlots = previewSlots();

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveSuccess(false);

    await onUpdateSettings({
      machineName,
      shiftStartTime,
      shiftHours: 8,
      hourlyTargetPieces: Number(hourlyTargetPieces),
      defaultDieType,
      operatorName,
      currencySymbol,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div>
      {/* Header Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2>Machine & Shift Settings</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Configure your paper dona machine parameters, shift schedule, and target capacities
        </p>
      </div>

      <div className="dashboard-grid">
        {/* Main Settings Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <SettingsIcon size={18} style={{ color: 'var(--accent-cyan)' }} />
              <span>Shift & Production Configuration</span>
            </h3>
            {saveSuccess && (
              <span className="badge-pill success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} /> Saved Successfully
              </span>
            )}
          </div>

          <form onSubmit={handleSave}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Machine Unit Name / Identification</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Hydraulic Double Die Dona Machine #1"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                required
              />
              <span className="form-hint">Displayed in headers and production reports</span>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Configurable Shift Start Time (8-Hour Shift)
                </label>
                <input
                  type="time"
                  className="form-input mono"
                  value={shiftStartTime}
                  onChange={(e) => setShiftStartTime(e.target.value)}
                  required
                />
                <span className="form-hint">
                  The system will automatically generate 8 one-hour production slots starting from this time
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Hourly Capacity Target (Pieces/Hour)</label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  className="form-input mono"
                  value={hourlyTargetPieces}
                  onChange={(e) => setHourlyTargetPieces(e.target.value)}
                  required
                />
                <span className="form-hint">
                  Shift target: {(Number(hourlyTargetPieces) * 8).toLocaleString()} pieces/shift
                </span>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Default Die / Product Size</label>
                <select
                  className="form-select"
                  value={defaultDieType}
                  onChange={(e) => setDefaultDieType(e.target.value)}
                >
                  <option value="6-inch Wrinkle Dona">6-inch Wrinkle Dona</option>
                  <option value="7-inch Silver Dona">7-inch Silver Dona</option>
                  <option value="8-inch Deep Dona">8-inch Deep Dona</option>
                  <option value="12-inch Buffet Pattal">12-inch Buffet Pattal</option>
                  <option value="14-inch Partition Plate">14-inch Partition Plate</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Currency Symbol</label>
                <input
                  type="text"
                  className="form-input mono"
                  style={{ maxWidth: '80px' }}
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Primary Operator / Supervisor Name</label>
              <input
                type="text"
                className="form-input"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Save Settings & Update Slots
            </button>
          </form>
        </div>

        {/* Dynamic Slot Preview Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Clock size={18} style={{ color: 'var(--accent-blue)' }} />
              <span>Generated 8 Shift Slots</span>
            </h3>
            <span className="badge-pill info">Auto-generated</span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Based on shift start time <strong style={{ color: 'var(--text-main)' }}>{shiftStartTime}</strong>:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {calculatedSlots.map((s) => (
              <div
                key={s.num}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.55rem 0.85rem',
                  background: 'rgba(16, 24, 39, 0.5)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                }}
              >
                <span className="slot-badge">Slot {s.num}</span>
                <span className="mono" style={{ fontWeight: 600 }}>{s.time}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <Info size={16} style={{ color: '#60a5fa', flexShrink: 0, marginTop: '2px' }} />
            <span>
              Changing the shift start time dynamically updates the entry slots on the Hourly Production and Dashboard screens.
            </span>
          </div>
        </div>
      </div>

      {/* Demo / Sample Data Management */}
      <div className="card" style={{ marginTop: '1.5rem', borderColor: 'rgba(255, 255, 255, 0.08)' }}>
        <div className="card-header">
          <h3 className="card-title">
            <Database size={18} style={{ color: 'var(--accent-amber)' }} />
            <span>Sample Data Management</span>
          </h3>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          By default, Machina starts clean for your real manual data entry. If you wish to test charts and reports with realistic dona manufacturing demo data, you can load sample records here.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsSeedConfirmOpen(true)}
          >
            <Database size={15} /> Load Realistic Demo Data (5 Days)
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setIsClearConfirmOpen(true)}
          >
            <Trash2 size={15} /> Reset / Clear All Production Records
          </button>
        </div>
      </div>

      {/* Seed Confirm Modal */}
      {isSeedConfirmOpen && (
        <div className="modal-overlay" onClick={() => setIsSeedConfirmOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Load Sample Data?</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsSeedConfirmOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                This will populate 5 days of realistic Dona / Pattal machine data (40 hourly slots, sample roll change stoppages, and paper roll expenses) so you can explore the charts and analytics.
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--accent-amber)' }}>
                Note: This will replace any currently entered records.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsSeedConfirmOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  setIsSeedConfirmOpen(false);
                  await onSeedDemoData();
                }}
              >
                Yes, Load Demo Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirm Modal */}
      {isClearConfirmOpen && (
        <div className="modal-overlay" onClick={() => setIsClearConfirmOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Clear All Machine Data?</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsClearConfirmOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                Are you sure you want to delete all production entries, downtime stoppage logs, and expense records?
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--accent-rose)' }}>
                This action is permanent and resets your system to a blank state.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsClearConfirmOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  setIsClearConfirmOpen(false);
                  await onClearData();
                }}
              >
                Yes, Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
