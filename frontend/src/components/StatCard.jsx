import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme = 'cyan',
  badgeText,
  badgeType = 'info',
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {Icon && (
          <div className={`stat-card-icon ${colorScheme}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      {(subtitle || badgeText) && (
        <div className="stat-card-footer">
          <span>{subtitle}</span>
          {badgeText && (
            <span className={`badge-pill ${badgeType}`}>{badgeText}</span>
          )}
        </div>
      )}
    </div>
  );
}
