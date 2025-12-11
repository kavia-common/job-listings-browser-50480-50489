import React, { createContext, useContext, useEffect, useState } from 'react';
import { matchJobsToAlerts } from './alerts';
import { fetchJobs } from '../api';
import { log } from '../theme';

// Simple in-app toast system
const ToastsContext = createContext({ toasts: [], push: () => {}, remove: () => {} });

// PUBLIC_INTERFACE
export function useToasts() {
  /** Access in-app toasts: { toasts, push(msg), remove(id) } */
  return useContext(ToastsContext);
}

// PUBLIC_INTERFACE
export function AlertsProvider({ children }) {
  /**
   * Watches for jobs changes (on load and userjobs:change) and runs alerts matcher.
   * Displays in-app toasts for new matches.
   */
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const ctrl = new AbortController();

    const notifyInApp = ({ job, message }) => {
      pushToast(`${message}`);
      log('info', 'Alert match:', message, job?.id);
    };

    const run = () => {
      fetchJobs(ctrl.signal)
        .then(({ jobs }) => {
          matchJobsToAlerts(jobs, { notify: true, onInAppNotify: notifyInApp });
        })
        .catch(() => {});
    };

    run();
    const onUserJobs = () => run();
    window.addEventListener('userjobs:change', onUserJobs);
    return () => {
      ctrl.abort();
      window.removeEventListener('userjobs:change', onUserJobs);
    };
  }, []);

  function pushToast(text) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((t) => [...t, { id, text }]);
    // auto dismiss
    setTimeout(() => removeToast(id), 4500);
  }
  function removeToast(id) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  return (
    <ToastsContext.Provider value={{ toasts, push: pushToast, remove: removeToast }}>
      {children}
      <Toasts toasts={toasts} onClose={removeToast} />
    </ToastsContext.Provider>
  );
}

function Toasts({ toasts, onClose }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div
      role="region"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        display: 'grid',
        gap: 8,
        zIndex: 50,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card"
          role="status"
          aria-live="polite"
          style={{
            padding: 10,
            borderLeft: '4px solid var(--color-secondary)',
            minWidth: 260,
            maxWidth: 360,
            background: 'var(--color-surface)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <div style={{ fontWeight: 600 }}>{t.text}</div>
            <button className="page-btn" onClick={() => onClose(t.id)} aria-label="Dismiss">×</button>
          </div>
        </div>
      ))}
    </div>
  );
}
