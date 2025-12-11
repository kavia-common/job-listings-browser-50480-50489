import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { listInterviewsByJob, createInterview, setInterviewScheduled, rescheduleInterview, cancelInterview } from '../utils/interviews';
import { getApplicationsForJob } from '../utils/applications';
import { useAlerts } from '../utils/AlertsProvider';


const cardStyle = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  marginBottom: 16,
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
};

const btn = {
  base: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid transparent',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  primary: {
    background: 'var(--color-primary)',
    color: 'white',
  },
  secondary: {
    background: 'var(--color-secondary)',
    color: '#111827',
  },
  subtle: {
    background: '#F3F4F6',
    color: '#111827',
    border: '1px solid #E5E7EB',
  },
  danger: {
    background: '#EF4444',
    color: 'white',
  },
};

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

export default function JobInterviews() {
  const { id: jobId } = useParams();
  const navigate = useNavigate();
  const { pushAlert } = useAlerts();
  const [interviews, setInterviews] = useState([]);
  const [apps, setApps] = useState([]);
  const [form, setForm] = useState({
    candidateEmail: '',
    candidateName: '',
    datetimeISO: '',
    mode: 'Video',
    notes: '',
  });

  useEffect(() => {
    setInterviews(listInterviewsByJob(jobId));
    setApps(getApplicationsForJob(jobId) || []);
  }, [jobId]);

  const candidates = useMemo(() => {
    // Unique by email from applications
    const uniq = new Map();
    apps.forEach((a) => {
      const email = (a?.applicant?.email || a?.email || '').toLowerCase();
      if (!email) return;
      const name = a?.applicant?.name || a?.name || email;
      if (!uniq.has(email)) uniq.set(email, { email, name, fromAppId: a?.id });
    });
    return Array.from(uniq.values());
  }, [apps]);

  function refresh() {
    setInterviews(listInterviewsByJob(jobId));
  }

  function handleCreate(e) {
    e.preventDefault();
    if (!form.candidateEmail || !form.datetimeISO) {
      pushAlert({ type: 'error', message: 'Please provide candidate and date/time.' });
      return;
    }
    try {
      const interview = createInterview({
        jobId,
        candidateEmail: form.candidateEmail,
        candidateName: form.candidateName,
        datetimeISO: new Date(form.datetimeISO).toISOString(),
        mode: form.mode,
        notes: form.notes,
        status: 'proposed',
      });
      setForm((f) => ({ ...f, notes: '' }));
      refresh();
      pushAlert({ type: 'success', message: 'Interview proposed.' });
      // navigate remains
    } catch (err) {
      pushAlert({ type: 'error', message: err.message || 'Failed to create interview' });
    }
  }

  function scheduleNow(id) {
    try {
      setInterviewScheduled(id);
      refresh();
      pushAlert({ type: 'success', message: 'Interview scheduled.' });
    } catch (err) {
      pushAlert({ type: 'error', message: err.message || 'Failed to schedule' });
    }
  }

  function doReschedule(id) {
    const v = prompt('Enter new date/time (local) e.g. 2025-01-15T14:30');
    if (!v) return;
    const d = new Date(v);
    if (isNaN(d.getTime())) {
      pushAlert({ type: 'error', message: 'Invalid date/time' });
      return;
    }
    try {
      rescheduleInterview(id, d.toISOString());
      refresh();
      pushAlert({ type: 'success', message: 'Interview rescheduled.' });
    } catch (err) {
      pushAlert({ type: 'error', message: err.message || 'Failed to reschedule' });
    }
  }

  function doCancel(id) {
    if (!window.confirm('Cancel this interview?')) return;
    try {
      cancelInterview(id);
      refresh();
      pushAlert({ type: 'success', message: 'Interview canceled.' });
    } catch (err) {
      pushAlert({ type: 'error', message: err.message || 'Failed to cancel' });
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0 }}>Manage Interviews for Job #{jobId}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={`/jobs/${jobId}`} style={{ ...btn.base, ...btn.subtle, textDecoration: 'none' }}>
            Back to Job
          </Link>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Propose New Interview</h3>
        <form onSubmit={handleCreate} style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Select Candidate</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={form.candidateEmail}
                onChange={(e) => {
                  const email = e.target.value;
                  const found = candidates.find((c) => c.email === email);
                  setForm((f) => ({ ...f, candidateEmail: email, candidateName: found?.name || '' }));
                }}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #d1d5db', minWidth: 240 }}
              >
                <option value="">Pick from applications...</option>
                {candidates.map((c) => (
                  <option key={c.email} value={c.email}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
              <span>or</span>
              <input
                placeholder="Candidate email"
                value={form.candidateEmail}
                onChange={(e) => setForm((f) => ({ ...f, candidateEmail: e.target.value }))}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #d1d5db', minWidth: 220 }}
              />
              <input
                placeholder="Candidate name (optional)"
                value={form.candidateName}
                onChange={(e) => setForm((f) => ({ ...f, candidateName: e.target.value }))}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #d1d5db', minWidth: 200 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Date & Time</label>
              <input
                type="datetime-local"
                value={form.datetimeISO}
                onChange={(e) => setForm((f) => ({ ...f, datetimeISO: e.target.value }))}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Mode</label>
              <select
                value={form.mode}
                onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
              >
                <option>Video</option>
                <option>Phone</option>
                <option>Onsite</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
            />
          </div>

          <div>
            <button type="submit" style={{ ...btn.base, ...btn.primary }}>Propose Interview</button>
          </div>
        </form>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Existing Interviews</h3>
        {interviews.length === 0 ? (
          <div style={{ color: '#6b7280' }}>No interviews yet. Propose your first interview above.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {interviews
              .sort((a, b) => new Date(a.datetimeISO) - new Date(b.datetimeISO))
              .map((iv) => (
                <div key={iv.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Badge tone={statusTone(iv.status)}>{iv.status}</Badge>
                      <div style={{ fontWeight: 600 }}>{iv.candidate?.name} ({iv.candidate?.email})</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {iv.status !== 'canceled' && (
                        <>
                          <button style={{ ...btn.base, ...btn.secondary }} onClick={() => scheduleNow(iv.id)}>Mark Scheduled</button>
                          <button style={{ ...btn.base, ...btn.subtle }} onClick={() => doReschedule(iv.id)}>Reschedule</button>
                          <button style={{ ...btn.base, ...btn.danger }} onClick={() => doCancel(iv.id)}>Cancel</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 6, color: '#374151' }}>
                    <div><strong>When:</strong> {new Date(iv.datetimeISO).toLocaleString()}</div>
                    <div><strong>Mode:</strong> {iv.mode}</div>
                    {iv.notes ? <div><strong>Notes:</strong> {iv.notes}</div> : null}
                  </div>
                  {Array.isArray(iv.history) && iv.history.length > 0 && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ cursor: 'pointer' }}>History</summary>
                      <ul>
                        {iv.history.map((h, idx) => (
                          <li key={idx} style={{ color: '#6b7280' }}>
                            {h.action} -> {h.status} at {new Date(h.at).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
