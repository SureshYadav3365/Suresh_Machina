import React from 'react';
import {
  PackageCheck,
  CheckCircle2,
  AlertOctagon,
  Clock,
  IndianRupee,
  Layers,
  Plus,
  Edit2,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';

export default function Dashboard({
  dashboardData,
  loading,
  onOpenProductionModal,
  onOpenDowntimeModal,
  currency = '₹',
}) {
  if (loading && !dashboardData) {
    return (
      <div className="empty-state" style={{ padding: '4rem 0' }}>
        <div className="pulse-dot" style={{ width: '16px', height: '16px' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
          Loading machine metrics...
        </p>
      </div>
    );
  }

  const summary = dashboardData?.summary || {
    totalPieces: 0,
    acceptedPieces: 0,
    rejectedPieces: 0,
    scrapRate: 0,
    slotsEntered: 0,
    totalSlots: 8,
    totalDowntimeMinutes: 0,
    totalDowntimeHours: 0,
    runningTimeHours: 8,
    totalExpenses: 0,
    targetAchievementRate: 0,
    machineAvailabilityRate: 100,
  };

  const hourlyTimeline = dashboardData?.hourlyTimeline || [];
  const downtimeRecords = dashboardData?.downtimeRecords || [];
  const downtimeReasons = dashboardData?.downtimeReasons || {};

  // Find max hourly pieces for chart scaling
  const maxSlotPieces = Math.max(
    ...hourlyTimeline.map((s) => s.totalPieces),
    1200 // Default baseline for dona machines
  );

  return (
    <div>
      {/* Top Metric Cards */}
      <div className="stat-grid">
        <StatCard
          title="Total Output"
          value={summary.totalPieces.toLocaleString()}
          subtitle={`${summary.slotsEntered} of ${summary.totalSlots} slots logged`}
          icon={Layers}
          colorScheme="cyan"
          badgeText={`${summary.targetAchievementRate}% target`}
          badgeType={summary.targetAchievementRate >= 80 ? 'success' : 'info'}
        />

        <StatCard
          title="Accepted Pieces"
          value={summary.acceptedPieces.toLocaleString()}
          subtitle="Net saleable good pieces"
          icon={CheckCircle2}
          colorScheme="emerald"
          badgeText="Good Quality"
          badgeType="success"
        />

        <StatCard
          title="Scrap & Rejected"
          value={summary.rejectedPieces.toLocaleString()}
          subtitle={`Scrap Rate: ${summary.scrapRate}%`}
          icon={AlertOctagon}
          colorScheme="rose"
          badgeText={summary.scrapRate > 4 ? 'High Scrap' : 'Optimal'}
          badgeType={summary.scrapRate > 4 ? 'danger' : 'info'}
        />

        <StatCard
          title="Machine Runtime"
          value={`${summary.runningTimeHours} hrs`}
          subtitle={`Downtime: ${summary.totalDowntimeMinutes} mins`}
          icon={Clock}
          colorScheme="amber"
          badgeText={`${summary.machineAvailabilityRate}% Uptime`}
          badgeType={summary.machineAvailabilityRate >= 85 ? 'success' : 'warning'}
        />

        <StatCard
          title="Daily Expenses"
          value={`${currency}${summary.totalExpenses.toLocaleString()}`}
          subtitle="Materials, power & spares"
          icon={IndianRupee}
          colorScheme="indigo"
          badgeText="Recorded"
          badgeType="info"
        />
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="dashboard-grid">
        {/* Hourly Production Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <TrendingUp size={20} style={{ color: 'var(--accent-cyan)' }} />
              <span>Hourly Production Output</span>
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Accepted (Cyan) vs Rejected (Rose)
            </span>
          </div>

          <div className="chart-container">
            <div className="hourly-bar-chart">
              {hourlyTimeline.map((slot) => {
                const total = slot.totalPieces || 0;
                const accepted = slot.acceptedPieces || 0;
                const rejected = slot.rejectedPieces || 0;

                const heightPercent = maxSlotPieces > 0 ? (total / maxSlotPieces) * 100 : 0;
                const acceptedPercent = total > 0 ? (accepted / total) * 100 : 0;
                const rejectedPercent = total > 0 ? (rejected / total) * 100 : 0;

                return (
                  <div key={slot.slotNumber} className="bar-column">
                    {total > 0 && (
                      <span className="bar-label-val">{accepted.toLocaleString()}</span>
                    )}
                    <div
                      className="bar-fill-wrapper"
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                      title={`Slot ${slot.slotNumber} (${slot.slotTime}): ${accepted} accepted, ${rejected} rejected`}
                    >
                      {total > 0 ? (
                        <>
                          <div
                            className="bar-segment-accepted"
                            style={{ height: `${acceptedPercent}%` }}
                          />
                          <div
                            className="bar-segment-rejected"
                            style={{ height: `${rejectedPercent}%` }}
                          />
                        </>
                      ) : (
                        <div
                          style={{
                            height: '100%',
                            background: 'rgba(255, 255, 255, 0.02)',
                          }}
                        />
                      )}
                    </div>
                    <span className="bar-label-slot">S{slot.slotNumber}</span>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--text-dim)',
                marginTop: '0.75rem',
              }}
            >
              <span>Shift Start ({dashboardData?.settings?.shiftStartTime || '08:00'})</span>
              <div style={{ display: 'flex', gap: '1.25rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      background: '#06b6d4',
                      borderRadius: '2px',
                    }}
                  />
                  Accepted Pieces
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      background: '#f43f5e',
                      borderRadius: '2px',
                    }}
                  />
                  Scrap / Rejects
                </span>
              </div>
              <span>Shift End (8 Hours)</span>
            </div>
          </div>
        </div>

        {/* Downtime & Stoppage Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <AlertTriangle size={20} style={{ color: 'var(--accent-amber)' }} />
              <span>Stoppages & Downtime</span>
            </h3>
            <button
              className="btn btn-warning btn-sm"
              onClick={onOpenDowntimeModal}
            >
              <Plus size={14} /> Log Stoppage
            </button>
          </div>

          {downtimeRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <CheckCircle2
                size={38}
                style={{ color: 'var(--accent-emerald)', margin: '0 auto 0.75rem' }}
              />
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>No Stoppages Logged</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Machine had continuous uninterrupted operation or stoppage has not been recorded yet.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Stoppage Duration by Reason:
                </div>
                {Object.entries(downtimeReasons).map(([reason, mins]) => (
                  <div key={reason} style={{ marginBottom: '0.5rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        marginBottom: '2px',
                      }}
                    >
                      <span>{reason}</span>
                      <span className="mono">{mins} mins</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min((mins / summary.totalDowntimeMinutes) * 100, 100)}%`,
                          background: 'var(--accent-amber)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
                {downtimeRecords.map((d) => (
                  <div
                    key={d._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{d.reason}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {d.startTime} - {d.endTime} {d.notes && `• ${d.notes}`}
                      </div>
                    </div>
                    <span className="badge-pill warning mono">{d.durationMinutes}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 8-Hour Slot Timeline Grid */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Clock size={20} style={{ color: 'var(--accent-cyan)' }} />
              <span>8-Hour Shift Production Slots</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Configured Shift: {dashboardData?.settings?.shiftStartTime || '08:00'} (8 One-Hour Production Slots)
            </p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onOpenProductionModal()}
          >
            <Plus size={15} /> Log Next Hour
          </button>
        </div>

        <div className="slots-container">
          {hourlyTimeline.map((slot) => {
            return (
              <div
                key={slot.slotNumber}
                className={`slot-card ${slot.isRecorded ? 'recorded' : 'empty'}`}
              >
                <div className="slot-card-top">
                  <div>
                    <span className="slot-badge">Slot {slot.slotNumber}</span>
                    <div className="slot-time">{slot.slotTime}</div>
                  </div>
                  {slot.isRecorded ? (
                    <span className="badge-pill success">Logged</span>
                  ) : (
                    <span className="badge-pill" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)' }}>
                      Pending
                    </span>
                  )}
                </div>

                {slot.isRecorded ? (
                  <>
                    <div className="slot-numbers">
                      <div className="slot-row">
                        <span className="slot-row-label">Total Produced:</span>
                        <span className="slot-row-val">{slot.totalPieces.toLocaleString()} pcs</span>
                      </div>
                      <div className="slot-row">
                        <span className="slot-row-label">Accepted (Good):</span>
                        <span className="slot-row-val" style={{ color: 'var(--accent-cyan)' }}>
                          {slot.acceptedPieces.toLocaleString()} pcs
                        </span>
                      </div>
                      <div className="slot-row">
                        <span className="slot-row-label">Rejected / Scrap:</span>
                        <span className="slot-row-val" style={{ color: 'var(--accent-rose)' }}>
                          {slot.rejectedPieces.toLocaleString()} ({slot.scrapRate}%)
                        </span>
                      </div>
                      <div className="slot-row">
                        <span className="slot-row-label">Die Type:</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {slot.itemType}
                        </span>
                      </div>
                    </div>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%' }}
                      onClick={() => onOpenProductionModal(slot)}
                    >
                      <Edit2 size={13} /> Edit Entry
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '0.75rem 0' }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
                      No count recorded for this slot
                    </p>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%' }}
                      onClick={() => onOpenProductionModal(slot)}
                    >
                      <Plus size={14} /> Enter Count
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
