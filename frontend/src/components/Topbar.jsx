import React from 'react';
import { Menu, Calendar, PlusCircle, Wrench } from 'lucide-react';

export default function Topbar({
  selectedDate,
  setSelectedDate,
  onOpenMobileMenu,
  machineName = 'Hydraulic Dona Machine #1',
  shiftStartTime = '08:00',
  onQuickLogProduction,
  onQuickLogDowntime,
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="mobile-menu-toggle"
          onClick={onOpenMobileMenu}
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <div className="topbar-machine-info">
          <h2>
            <span>{machineName}</span>
            <span className="topbar-shift-pill">
              Shift: {shiftStartTime} (8h)
            </span>
          </h2>
        </div>
      </div>

      <div className="topbar-right">
        {/* Date Selector */}
        <div className="date-picker-wrapper" title="Change date to view or enter data for another day">
          <Calendar size={16} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {/* Quick Log Action */}
        <button
          className="btn btn-primary btn-sm"
          onClick={onQuickLogProduction}
          title="Quickly record hourly piece count"
        >
          <PlusCircle size={15} />
          <span>Add Production</span>
        </button>

        <button
          className="btn btn-warning btn-sm"
          onClick={onQuickLogDowntime}
          title="Quickly record machine stoppage"
        >
          <Wrench size={15} />
          <span className="d-none-sm">Log Downtime</span>
        </button>
      </div>
    </header>
  );
}
