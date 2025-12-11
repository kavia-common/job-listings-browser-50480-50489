import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchJobs } from '../api';
import {
  loadApplications,
  saveApplications,
} from '../utils/applications';
import { loadProfile } from '../utils/storage';

// Helpers for URL query params
function useQuery() {
  const loc = useLocation();
  return useMemo(() => new URLSearchParams(loc.search || ''), [loc.search]);
}

function formatDateTime(ts) {
  try {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d)) return '';
    return d.toLocaleString();
  } catch {
    return '';
  }
}

function Badge({ status }) {
  if (!status) return null;
  const norm = String(status).toLowerCase();
  let style = {
    background: 'rgba(37,99,235,0.08)',
    border: '1px solid rgba(37,99,235,0.25)',
    color: '#1d4ed8',
  };
  if (norm === 'shortlisted' || norm === 'shortlist') {
    style = {
      background: 'rgba(37,99,235,0.08)',
      border: '1px solid rgba(37,99,235,0.25)',
      color: '#1d4ed8',
    };
  } else if (norm === 'rejected' || norm === 'reject') {
    style = {
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.25)',
      color: '#b91c1c',
    };
  } else if (norm === 'hired' || norm === 'hire') {
    style = {
      background: 'rgba(245,158,11,0.08)',
      border: '1px solid rgba(245,158,11,0.25)',
      color: '#b45309',
    };
  }
  return (
    <span className="badge" style={style}>
      {String(status).charAt(0).toUpperCase() + String(status).slice(1)}
    </span>
  );
}

// PUBLIC_INTERFACE
export default function ApplicationsPage() {
  /**
   * Applications management page:
   * - List all local applications
   * - Filter by status and job title
   * - Quick-view applicant profile from local storage
   * - Download resume if available
   * - Update status (Shortlist/Reject/Hire) persisted in localStorage with timestamp
   */
  const qs = useQuery();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [titleFilter, setTitleFilter] = useState('');
  const [profileOpenFor, setProfileOpenFor] = useState(null); // jobId to show quick view for
  const [profile, setProfile] = useState(loadProfile());

  // Load jobs and applications
  useEffect(() => {
    const ctrl = new AbortController();
    fetchJobs(ctrl.signal)
      .then(({ jobs: data }) => setJobs(Array.isArray(data) ? data : []))
      .catch(() => setJobs([]));
    try {
      setApps(loadApplications());
    } catch {
      setApps({});
    }
    // Optionally pre-filter by jobId
    const jobId = qs.get('jobId');
    if (jobId) {
      // Could preset a local filter (we keep full list; we'll show a note and allow search by job title)
      // We'll set titleFilter to job title for convenience once jobs load.
    }
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If query has jobId, find title and set as filter
  useEffect(() => {
    const jobId = qs.get('jobId');
    if (jobId && jobs.length > 0) {
      const j = jobs.find((x) => String(x.id) === String(jobId));
      if (j?.title) setTitleFilter(j.title);
    }
  }, [qs, jobs]);

  // Map jobId -> job info for display
  const jobMap = useMemo(() => {
    const m = {};
    for (const j of jobs) m[String(j.id)] = j;
    return m;
  }, [jobs]);

  const entries = useMemo(() => {
    const arr = Object.values(apps || {});
    // extend existing records with defaults
    return arr
      .map((a) => ({
        ...a,
        status: a.status || 'submitted',
        lastStatusAt: a.lastStatusAt || a.submittedAt || null,
      }))
      .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  }, [apps]);

  const filtered = useMemo(() => {
    const s = String(statusFilter || 'all').toLowerCase();
    const q = String(titleFilter || '').trim().toLowerCase();

    return entries.filter((a) => {
      const job = jobMap[String(a.jobId)];
      const title = job?.title || `Job #${a.jobId}`;
      const matchesStatus = s === 'all' ? true : String(a.status || '').toLowerCase() === s;
      const matchesTitle = q ? String(title).toLowerCase().includes(q) : true;
      return matchesStatus && matchesTitle;
    });
  }, [entries, statusFilter, titleFilter, jobMap]);

  function updateStatus(jobId, nextStatus) {
    const id = String(jobId);
    const now = Date.now();
    const current = loadApplications();
    if (!current[id]) return;
    current[id] = {
      ...current[id],
      status: nextStatus,
      lastStatusAt: now,
    };
    saveApplications(current);
    setApps(current);
  }

  function resumeAction(app) {
    if (app?.resume?.dataUrl) {
      // Open in new tab for preview; also supports download via anchor
      window.open(app.resume.dataUrl, '_blank', 'noopener,noreferrer');
    } else if (profile?.resume?.dataUrl) {
      window.open(profile.resume.dataUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.alert('No resume available for this application.');
    }
  }

  const empty = filtered.length === 0;

  return (
    <div className="main">
      <div className="detail" role="region" aria-label="Applications management">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>Applications</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link className="page-btn" to="/" aria-label="Back to job list">
              ← Jobs
            </Link>
            <Link className="page-btn" to="/profile" aria-label="Go to profile">
              Profile
            </Link>
          </div>
        </div>

        <div className="separator" />

        <section className="controls" aria-label="Applications filters">
          <label className="visually-hidden" htmlFor="ap-status">Status</label>
          <select
            id="ap-status"
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All</option>
            <option value="submitted">Submitted</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="rejected">Rejected</option>
            <option value="hired">Hired</option>
          </select>

          <label className="visually-hidden" htmlFor="ap-title">Job title</label>
          <input
            id="ap-title"
            className="input"
            type="search"
            placeholder="Filter by job title"
            value={titleFilter}
            onChange={(e) => setTitleFilter(e.target.value)}
            aria-label="Filter by job title"
          />

          <div className="button secondary" role="status" aria-live="polite">
            {filtered.length} result{filtered.length === 1 ? '' : 's'}
          </div>
        </section>

        <div className="separator" />

        {empty ? (
          <div className="card" style={{ padding: 14 }}>
            <strong>No applications found.</strong>
            <div className="meta">When you apply to jobs, they will appear here for review and management.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {filtered.map((a) => {
              const job = jobMap[String(a.jobId)];
              const title = job?.title || `Job #${a.jobId}`;
              const company = job?.company || (a.company || 'Company');
              const submitted = formatDateTime(a.submittedAt);
              const last = formatDateTime(a.lastStatusAt);

              return (
                <article key={`${a.jobId}-${a.submittedAt}`} className="card" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0 }}>{title}</h3>
                        <span className="meta">·</span>
                        <div className="meta">{company}</div>
                        <Badge status={a.status || 'submitted'} />
                      </div>
                      <div className="meta" style={{ marginTop: 4 }}>
                        Applicant: {a.fullName || 'N/A'} · {a.email || 'N/A'}
                      </div>
                      <div className="meta">
                        Submitted: {submitted || 'N/A'} {last ? `· Last status: ${last}` : null}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link className="page-btn" to={`/jobs/${encodeURIComponent(a.jobId)}`} aria-label="Open job">Open job</Link>
                      <Link className="page-btn" to={`/jobs/${encodeURIComponent(a.jobId)}/apply`} aria-label="View or update application">View</Link>
                      <button
                        className="page-btn"
                        onClick={() => setProfileOpenFor(String(a.jobId))}
                        aria-label="Quick view profile"
                        title="Quick view profile"
                      >
                        Profile
                      </button>
                      <button
                        className="page-btn"
                        onClick={() => resumeAction(a)}
                        aria-label="Open or download resume"
                        title="Open or download resume"
                        disabled={!(a?.resume?.dataUrl || profile?.resume?.dataUrl)}
                        style={{
                          opacity: (a?.resume?.dataUrl || profile?.resume?.dataUrl) ? 1 : 0.7,
                          cursor: (a?.resume?.dataUrl || profile?.resume?.dataUrl) ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Resume
                      </button>
                    </div>
                  </div>

                  <div className="separator" />

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <div className="meta">Manage status:</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="page-btn"
                        onClick={() => updateStatus(a.jobId, 'shortlisted')}
                        aria-label="Mark as shortlisted"
                        style={{
                          borderColor: a.status === 'shortlisted' ? 'rgba(37,99,235,0.35)' : undefined,
                          background: a.status === 'shortlisted' ? 'rgba(37,99,235,0.08)' : undefined,
                          color: a.status === 'shortlisted' ? '#1d4ed8' : undefined,
                          fontWeight: a.status === 'shortlisted' ? 700 : 500,
                        }}
                      >
                        Shortlist
                      </button>
                      <button
                        className="page-btn"
                        onClick={() => updateStatus(a.jobId, 'rejected')}
                        aria-label="Mark as rejected"
                        style={{
                          borderColor: a.status === 'rejected' ? 'rgba(239,68,68,0.35)' : undefined,
                          background: a.status === 'rejected' ? 'rgba(239,68,68,0.08)' : undefined,
                          color: a.status === 'rejected' ? '#b91c1c' : undefined,
                          fontWeight: a.status === 'rejected' ? 700 : 500,
                        }}
                      >
                        Reject
                      </button>
                      <button
                        className="page-btn"
                        onClick={() => updateStatus(a.jobId, 'hired')}
                        aria-label="Mark as hired"
                        style={{
                          borderColor: a.status === 'hired' ? 'rgba(245,158,11,0.35)' : undefined,
                          background: a.status === 'hired' ? 'rgba(245,158,11,0.08)' : undefined,
                          color: a.status === 'hired' ? '#b45309' : undefined,
                          fontWeight: a.status === 'hired' ? 700 : 500,
                        }}
                      >
                        Hire
                      </button>
                    </div>
                  </div>

                  {profileOpenFor === String(a.jobId) ? (
                    <ProfileQuickView onClose={() => setProfileOpenFor(null)} />
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileQuickView({ onClose }) {
  const [p, setP] = useState(loadProfile());

  useEffect(() => {
    // In case profile changes elsewhere
    try {
      setP(loadProfile());
    } catch {
      // noop
    }
  }, []);

  const personal = p?.personal || {};
  const skills = Array.isArray(p?.skills) ? p.skills : [];
  const exp = Array.isArray(p?.experience) ? p.experience : [];
  const edu = Array.isArray(p?.education) ? p.education : [];

  return (
    <div className="card" style={{ padding: 12, marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h4 style={{ margin: 0 }}>Applicant Profile</h4>
        <button className="page-btn" onClick={onClose} aria-label="Close profile panel">Close</button>
      </div>
      <div className="separator" />
      <div style={{ display: 'grid', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{personal.fullName || '—'}</div>
          <div className="meta">{personal.title || '—'}</div>
          <div className="meta">{personal.email || '—'} · {personal.phone || '—'}</div>
          <div className="meta">{personal.location || ''}</div>
        </div>

        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Skills</div>
          {skills.length ? (
            <div className="tags">
              {skills.map((s) => (
                <span key={s} className="tag">{s}</span>
              ))}
            </div>
          ) : <div className="meta">No skills listed.</div>}
        </div>

        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Experience</div>
          {exp.length ? (
            <div style={{ display: 'grid', gap: 6 }}>
              {exp.map((e) => (
                <div key={e.id} className="meta">
                  <strong>{e.role || 'Role'}</strong> @ {e.company || 'Company'} — {fmt(e.start)}–{e.current ? 'Present' : fmt(e.end)}
                </div>
              ))}
            </div>
          ) : <div className="meta">No experience entries.</div>}
        </div>

        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Education</div>
          {edu.length ? (
            <div style={{ display: 'grid', gap: 6 }}>
              {edu.map((e) => (
                <div key={e.id} className="meta">
                  <strong>{e.degree || 'Degree'}</strong> {e.field ? `in ${e.field}` : ''} · {e.school || 'School'} — {fmt(e.start)}–{fmt(e.end)}
                </div>
              ))}
            </div>
          ) : <div className="meta">No education entries.</div>}
        </div>
      </div>
    </div>
  );
}

function fmt(s) {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (!isNaN(d)) return d.toLocaleDateString();
  } catch {}
  return s;
}
