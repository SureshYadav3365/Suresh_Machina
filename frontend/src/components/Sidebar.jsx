import React from 'react';
import {
  LayoutDashboard,
  Clock,
  AlertTriangle,
  Receipt,
  BarChart3,
  Settings,
  Cpu,
  X,
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  settings,
}) {
  const navItems = [
    { id: 'dashboard', label: 'Live Dashboard', icon: LayoutDashboard },
    { id: 'production', label: 'Hourly Production', icon: Clock },
    { id: 'downtime', label: 'Machine Downtime', icon: AlertTriangle },
    { id: 'expenses', label: 'Expenses & Spares', icon: Receipt },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Machine Settings', icon: Settings },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (window.innerWidth <= 992) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 35, display: window.innerWidth <= 992 ? 'block' : 'none' }}
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <Cpu size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="sidebar-brand-name">MACHINA</div>
            <div className="sidebar-brand-sub">Dona / Pattal Unit</div>
          </div>
          {window.innerWidth <= 992 && (
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="machine-status-badge">
            <span className="pulse-dot"></span>
            <div>
              <div style={{ fontWeight: 600 }}>Shift {settings?.shiftStartTime || '08:00'} (8 Hrs)</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Target: {settings?.hourlyTargetPieces || 1200} pcs/hr
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
