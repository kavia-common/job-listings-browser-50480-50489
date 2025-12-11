import React, { useEffect, useState } from 'react';
import { listInterviewsForCandidate, acknowledgeInterview } from '../utils/interviews';
import { useAlerts } from '../utils/AlertsProvider';

import { getItem } from '../utils/storage';

const cardStyle = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  marginBottom: 16,
};

const btnBase = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid transparent',
  cursor: 'pointer',
  fontWeight: 600,
  transition: 'all 0.2s ease',
};

const btnPrimary = { background: 'var(--color-primary)', color: 'white' };

function Badge({ children, tone = 'default' }) {
  const bg =
    tone === 'success'
      ? '#D1FAE5'
      : tone === 'warning'
      ? '#FEF3C7'
      : tone === 'danger'
      ? '#FEE2E2'
      : '#E5E7EB';
  const color =
    tone === 'success'
      ? '#065F46'
      : tone === 'warning'
      ? '#92400E'
      : tone === 'danger'
      ? '#991B1B'
      : '#374151';
  return (
    <span style={{ background: bg, color, borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 600 }}>
      {children}
    </span>
  );
}

function statusTone(status) {
  switch (status) {
    case 'scheduled':
      return 'success';
    case 'proposed':
    case 'rescheduled':
      return 'warning';
    case 'canceled':
      return 'danger';
    default:
      return 'default';
  }
}

export default function Interviews() {
  const { pushAlert } = useAlerts();
  const [email, setEmail] = useState('');
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    // Attempt to determine current profile email from profile storage, fallback to alerts user info if any
    const profile = getItem('profile');
    const em = profile?.personal?.email || profile?.email || profile?.user?.email || '';
    setEmail(em);
  }, []);

  useEffect(() => {
    if (email) {
      setInterviews(listInterviewsForCandidate(email));
    }
  }, [email]);

  function refresh() {
    if (email) setInterviews(listInterviewsForCandidate(email));
  }

  function doAck(id) {
    try {
      acknowledgeInterview(id);
      pushAlert({ type: 'success', message: 'Interview acknowledged.' });
      refresh();
    } catch (err) {
      pushAlert({ type: 'error', message: err.message || 'Failed to acknowledge' });
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>My Interviews</h2>

      {!email ? (
        <div style={{ ...cardStyle, color: '#6b7280' }}>
          We could not determine your profile email. Please update your Profile to view interviews targeted to your email.
        </div>
      ) : null}

      <div style={cardStyle}>
        <div style={{ marginBottom: 8, color: '#374151' }}>
          Viewing interviews for: <strong>{email || 'Unknown'}</strong>
        </div>

        {interviews.length === 0 ? (
          <div style={{ color: '#6b7280' }}>No interviews yet. You will see interview invitations here.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {interviews
              .sort((a, b) => new Date(a.datetimeISO) - new Date(b.datetimeISO))
              .map((iv) => (
                <div key={iv.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Badge tone={statusTone(iv.status)}>{iv.status}</Badge>
                      <div><strong>Job:</strong> {iv.jobId}</div>
                    </div>
                    <div>
                      {iv.status !== 'canceled' && (
                        <button style={{ ...btnBase, ...btnPrimary }} onClick={() => doAck(iv.id)}>
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 6, color: '#374151' }}>
                    <div><strong>When:</strong> {new Date(iv.datetimeISO).toLocaleString()}</div>
                    <div><strong>Mode:</strong> {iv.mode}</div>
                    {iv.notes ? <div><strong>Notes:</strong> {iv.notes}</div> : null}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
