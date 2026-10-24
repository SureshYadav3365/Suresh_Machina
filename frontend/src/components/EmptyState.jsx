import React from 'react';
import { Layers } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Layers,
  title = 'No Records Found',
  description = 'There are no entries logged for this period yet.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={28} />
      </div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-desc">{description}</div>
      {actionLabel && onAction && (
        <button className="btn btn-primary btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
