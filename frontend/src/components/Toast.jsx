import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const icon =
          toast.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald" style={{ color: '#10b981' }} />
          ) : toast.type === 'error' ? (
            <AlertCircle size={18} className="text-rose" style={{ color: '#f43f5e' }} />
          ) : (
            <Info size={18} className="text-cyan" style={{ color: '#06b6d4' }} />
          );

        return (
          <div key={toast.id} className={`toast ${toast.type || 'info'}`}>
            {icon}
            <div style={{ flex: 1 }}>{toast.message}</div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                padding: '2px',
              }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
