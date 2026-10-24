import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Printer,
  TrendingUp,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { api } from '../api';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';

export default function Reports({ currency = '₹' }) {
  const [period, setPeriod] = useState('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { period };
      if (period === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      const res = await api.getAnalytics(params);
      if (res.success) {
        setReportData(res);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period]);

  const handleApplyCustom = () => {
    if (startDate && endDate) {
      fetchReport();
    }
  };

  const summary = reportData?.summary || {
    totalPieces: 0,
    acceptedPieces: 0,
    rejectedPieces: 0,
    scrapRate: 0,
    totalDowntimeMinutes: 0,
    totalDowntimeHours: 0,
    totalExpenses: 0,
    costPer1000Pieces: 0,
  };

  const dailyBreakdown = reportData?.dailyBreakdown || [];
  const downtimeReasons = reportData?.downtimeReasons || {};
  const expenseCategories = reportData?.expenseCategories || {};

  // Find max daily total for chart scaling
  const maxDailyPieces = Math.max(...dailyBreakdown.map((d) => d.totalPieces), 5000);

  return (
    <div>
      {/* Header Bar */}
      <div
        className="no-print"
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
          <h2>Production & Operational Reports</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Comprehensive analytics for paper dona and pattal manufacturing
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Period selector */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '3px' }}>
            {['daily', 'weekly', 'monthly', 'custom'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  background: period === p ? 'var(--accent-blue)' : 'transparent',
                  color: period === p ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s',
                }}
              >
                {p === 'weekly' ? '7 Days' : p === 'monthly' ? '30 Days' : p}
              </button>
            ))}
          </div>

          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            <Printer size={15} /> Print Report
          </button>
        </div>
      </div>

      {/* Custom Range Picker */}
      {period === 'custom' && (
        <div
          className="card no-print"
          style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>From:</span>
            <input
              type="date"
              className="form-input mono"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>To:</span>
            <input
              type="date"
              className="form-input mono"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleApplyCustom}>
            <Filter size={14} /> Apply Filter
          </button>
        </div>
      )}

      {/* Printable Heading */}
      <div style={{ display: 'none' }} className="d-print-block">
        <h1 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>
          MACHINA - Paper Dona/Pattal Machine Report
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>
          Period: {reportData?.startDate} to {reportData?.endDate} • Printed on {new Date().toLocaleString()}
        </p>
      </div>

      {/* Aggregate Stats Grid */}
      <div className="stat-grid">
        <StatCard
          title="Period Output (Gross)"
          value={summary.totalPieces.toLocaleString()}
          subtitle={`Across ${dailyBreakdown.length} active days`}
          icon={TrendingUp}
          colorScheme="cyan"
        />

        <StatCard
          title="Accepted (Good Output)"
          value={summary.acceptedPieces.toLocaleString()}
          subtitle="Saleable pack ready"
          icon={CheckCircle2}
          colorScheme="emerald"
          badgeText="Good Quality"
          badgeType="success"
        />

        <StatCard
          title="Scrap & Defect Rate"
          value={`${summary.scrapRate}%`}
          subtitle={`${summary.rejectedPieces.toLocaleString()} pieces discarded`}
          icon={AlertTriangle}
          colorScheme="rose"
          badgeText={summary.scrapRate > 4 ? 'Scrap Alert' : 'Normal'}
          badgeType={summary.scrapRate > 4 ? 'danger' : 'info'}
        />

        <StatCard
          title="Total Stoppages"
          value={`${summary.totalDowntimeHours} hrs`}
          subtitle={`${summary.totalDowntimeMinutes} mins downtime`}
          icon={AlertTriangle}
          colorScheme="amber"
        />

        <StatCard
          title="Total Expenses"
          value={`${currency}${summary.totalExpenses.toLocaleString()}`}
          subtitle={`Cost/1K pcs: ${currency}${summary.costPer1000Pieces}`}
          icon={Receipt}
          colorScheme="indigo"
          badgeText="Operating Cost"
          badgeType="info"
        />
      </div>

      {/* Production Trend Chart */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">
            <BarChart3 size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span>Daily Production Trend</span>
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Daily gross vs accepted Dona/Pattal count
          </span>
        </div>

        {dailyBreakdown.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No Report Data Available"
            description="No production records match the selected date range."
          />
        ) : (
          <div className="chart-container">
            <div className="hourly-bar-chart" style={{ height: '240px' }}>
              {dailyBreakdown.map((item) => {
                const total = item.totalPieces || 0;
                const accepted = item.acceptedPieces || 0;
                const rejected = item.rejectedPieces || 0;
                const heightPercent = maxDailyPieces > 0 ? (total / maxDailyPieces) * 100 : 0;
                const acceptedPercent = total > 0 ? (accepted / total) * 100 : 0;
                const rejectedPercent = total > 0 ? (rejected / total) * 100 : 0;

                return (
                  <div key={item.date} className="bar-column">
                    {total > 0 && (
                      <span className="bar-label-val">{accepted.toLocaleString()}</span>
                    )}
                    <div
                      className="bar-fill-wrapper"
                      style={{ height: `${Math.max(heightPercent, 4)}%`, maxWidth: '50px' }}
                      title={`${item.date}: ${accepted} accepted, ${rejected} scrap`}
                    >
                      {total > 0 && (
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
                      )}
                    </div>
                    <span className="bar-label-slot" style={{ fontSize: '0.7rem' }}>
                      {item.date.slice(5)}
                    </span>
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
              <span>{reportData?.startDate}</span>
              <div style={{ display: 'flex', gap: '1.25rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#06b6d4', borderRadius: '2px' }} />
                  Accepted Pieces
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#f43f5e', borderRadius: '2px' }} />
                  Scrap / Rejects
                </span>
              </div>
              <span>{reportData?.endDate}</span>
            </div>
          </div>
        )}
      </div>

      {/* Two-Column Breakdown */}
      <div className="dashboard-grid">
        {/* Downtime Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <AlertTriangle size={18} style={{ color: 'var(--accent-amber)' }} />
              <span>Downtime Causes Distribution</span>
            </h3>
          </div>

          {Object.keys(downtimeReasons).length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
              No stoppage logged in this period.
            </p>
          ) : (
            <div>
              {Object.entries(downtimeReasons).map(([cause, mins]) => (
                <div key={cause} style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 500 }}>{cause}</span>
                    <span className="mono">{mins} mins ({(mins / 60).toFixed(1)}h)</span>
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
          )}
        </div>

        {/* Expense Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Receipt size={18} style={{ color: 'var(--accent-indigo)' }} />
              <span>Expense Categories Breakdown</span>
            </h3>
          </div>

          {Object.keys(expenseCategories).length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
              No expenses recorded in this period.
            </p>
          ) : (
            <div>
              {Object.entries(expenseCategories).map(([cat, amt]) => (
                <div key={cat} style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 500 }}>{cat}</span>
                    <span className="mono">{currency}{amt.toLocaleString()}</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min((amt / summary.totalExpenses) * 100, 100)}%`,
                        background: 'var(--accent-indigo)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Calendar size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span>Daily Manufacturing Log Table</span>
          </h3>
        </div>

        {dailyBreakdown.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Records Found"
            description="No activity logged for this time window."
          />
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Hours Logged</th>
                  <th style={{ textAlign: 'right' }}>Total Pieces</th>
                  <th style={{ textAlign: 'right' }}>Accepted Good</th>
                  <th style={{ textAlign: 'right' }}>Scrap Pieces</th>
                  <th style={{ textAlign: 'right' }}>Scrap %</th>
                  <th style={{ textAlign: 'right' }}>Downtime</th>
                  <th style={{ textAlign: 'right' }}>Expenses</th>
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown.map((row) => (
                  <tr key={row.date}>
                    <td className="mono" style={{ fontWeight: 600 }}>{row.date}</td>
                    <td>{row.slotsCount} / 8 slots</td>
                    <td className="mono" style={{ textAlign: 'right' }}>{row.totalPieces.toLocaleString()}</td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {row.acceptedPieces.toLocaleString()}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', color: row.rejectedPieces > 0 ? 'var(--accent-rose)' : 'inherit' }}>
                      {row.rejectedPieces.toLocaleString()}
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      <span className={`badge-pill ${row.scrapRate > 4 ? 'danger' : row.scrapRate > 0 ? 'warning' : 'success'}`}>
                        {row.scrapRate}%
                      </span>
                    </td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {row.downtimeMinutes > 0 ? `${row.downtimeMinutes}m` : '0m'}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                      {currency}{row.expenses.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
