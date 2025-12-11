import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchJobs } from '../api';
import { getApplication, markApplicationJobDeleted } from '../utils/applications';
import { isJobSaved, toggleSavedJob } from '../utils/savedJobs';
import { isUserOwnedJob, togglePauseJob, deleteUserJob } from '../utils/userJobs';

/**
 * Format a salary range using Ocean Professional themed concise style.
 */
function formatSalary(min, max) {
  const hasMin = Number.isFinite(min);
  const hasMax = Number.isFinite(max);
  const fmt = (n) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (hasMin && hasMax) return `${fmt(min)}–${fmt(max)}`;
  if (hasMin) return `From ${fmt(min)}`;
  if (hasMax) return `Up to ${fmt(max)}`;
  return 'Not specified';
}

// PUBLIC_INTERFACE
export default function JobDetails() {
  /**
   * Displays details for a single job by id.
   * - Uses the same data source as list (api.js) and falls back to mockJobs.json.
   * - Gracefully handles missing fields.
   * - Shows company/location/type, tags, salary range, and an Apply action.
   * - Adds Save/Unsave toggle persisted to localStorage (savedJobs).
   */
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: null, jobs: [] });

  useEffect(() => {
    const ctrl = new AbortController();
    fetchJobs(ctrl.signal)
      .then(({ jobs }) => setState({ loading: false, error: null, jobs }))
      .catch((e) => setState({ loading: false, error: e.message, jobs: [] }));
    return () => ctrl.abort();
  }, []);

  const job = useMemo(
    () => state.jobs.find((j) => String(j.id) === String(id)),
    [state.jobs, id]
  );

  // Hooks must be declared before any early returns
  const [saved, setSaved] = useState(isJobSaved(id));

  useEffect(() => {
    const onChange = (e) => {
      if (String(e.detail?.id) === String(id)) setSaved(Boolean(e.detail?.saved));
    };
    window.addEventListener('savedjobs:change', onChange);
    return () => window.removeEventListener('savedjobs:change', onChange);
  }, [id]);

  if (state.loading) {
    return (
      <div className="main">
        <div className="detail" role="status" aria-live="polite">
          <strong>Loading job…</strong>
          <div className="meta">Fetching job details.</div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="main">
        <div className="detail" role="alert">
          <strong>Failed to load job.</strong>
          <div className="meta">{state.error}</div>
          <div className="separator" />
          <button className="button" onClick={() => navigate('/')} aria-label="Back to job list">
            ← Back to list
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="main">
        <div className="detail" role="alert">
          <strong>Job not found</strong>
          <div className="meta">The job may have been removed or the link is invalid.</div>
          <div className="separator" />
          <button className="button" onClick={() => navigate('/')} aria-label="Back to job list">
            ← Back to list
          </button>
        </div>
      </div>
    );
  }

  const company = job.company || 'Company';
  const title = job.title || 'Untitled role';
  const location = job.location || 'Unspecified';
  const type = (job.type || 'Unknown').toString();
  const posted = job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'N/A';

  // Normalize salary fields supporting salaryMin/salaryMax or nested salary
  const salaryMin = Number.isFinite(job.salaryMin)
    ? job.salaryMin
    : job.salary?.min ?? undefined;
  const salaryMax = Number.isFinite(job.salaryMax)
    ? job.salaryMax
    : job.salary?.max ?? undefined;

  const applyUrl = job.applyUrl || job.applyURL || job.url || '';
  const existingApp = getApplication(String(id));
  const appliedInfo = existingApp ? `Applied ${new Date(existingApp.submittedAt).toLocaleString()}` : '';

  function onApply() {
    if (applyUrl && /^https?:\/\//i.test(String(applyUrl))) {
      window.open(applyUrl, '_blank', 'noopener,noreferrer');
    } else {
      navigate(`/jobs/${encodeURIComponent(id)}/apply`);
    }
  }

  function onToggleSave() {
    const next = toggleSavedJob(id);
    setSaved(next);
  }

  const saveTitle = saved ? 'Unsave job' : 'Save job';
  const saveIcon = saved ? '🔖' : '📑';

  const owner = isUserOwnedJob(String(id));
  const paused = !!job.paused;

  function onPauseToggle() {
    const next = togglePauseJob(String(id));
    if (next) {
      // if paused now, keep details visible but show badge
      // trigger reload via event listened by lists; local state already updated in job variable only on next fetch
      // we can just navigate to same route to refresh state from api fetch if needed
      navigate(0);
    }
  }

  function onDelete() {
    const ok = window.confirm('Delete this job? This cannot be undone.');
    if (!ok) return;
    const removed = deleteUserJob(String(id));
    if (removed) {
      try { markApplicationJobDeleted(String(id)); } catch {}
      // If saved, Saved page will get event from saved toggle elsewhere. We leave saved state as-is; user can clean up from Saved page.
      navigate('/', { replace: true });
    }
  }

  return (
    <div className="main">
      <div className="detail" role="region" aria-label="Job details">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="button secondary" onClick={() => navigate(-1)} aria-label="Go back">
            ← Back
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {appliedInfo ? (
              <span className="meta" style={{ color: '#1d4ed8', fontWeight: 600 }}>{appliedInfo}</span>
            ) : null}
            {existingApp ? (
              <a
                className="page-btn"
                href={`/applications?jobId=${encodeURIComponent(id)}`}
                aria-label="View application record"
                title="View application record"
              >
                View application
              </a>
            ) : null}
            {paused ? (
              <span className="badge" title="Paused" aria-label="Job is paused" style={{ background: 'rgba(245,158,11,.08)', borderColor: 'rgba(245,158,11,.25)', color: '#b45309' }}>
                Paused
              </span>
            ) : null}
            <button
              className="page-btn"
              aria-pressed={saved}
              onClick={onToggleSave}
              title={saveTitle}
              aria-label={saveTitle}
              style={{
                minWidth: 36,
                height: 36,
                borderColor: saved ? 'rgba(245, 158, 11, 0.35)' : undefined,
                background: saved ? 'rgba(245, 158, 11, 0.12)' : undefined,
                color: saved ? '#b45309' : undefined,
                fontWeight: saved ? 700 : 500,
              }}
            >
              {saveIcon}
            </button>
            <button className="button" onClick={onApply} aria-label="Apply to this job" disabled={paused && !owner}>
              {appliedInfo ? 'Update application' : 'Apply'}
            </button>
            {owner && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <a className="page-btn" href={`/jobs/${encodeURIComponent(id)}/edit`} aria-label="Edit job">Edit</a>
                <button className="page-btn" onClick={onPauseToggle} aria-label={paused ? 'Unpause job' : 'Pause job'}>
                  {paused ? 'Unpause' : 'Pause'}
                </button>
                <button className="page-btn" onClick={onDelete} aria-label="Delete job" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {paused ? (
          <div className="meta" role="status" style={{ marginTop: 8, color: '#b45309' }}>
            This job is paused and hidden from browsing and saved pages. Owners can still view and edit it.
          </div>
        ) : null}

        <div className="separator" />

        {/* Company header block (name/logo/location) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          {/* Simple logo placeholder with initials; if a logoUrl existed we could use it */}
          <div
            aria-hidden
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--color-primary)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              boxShadow: 'var(--shadow-md)',
            }}
            title={company}
          >
            {String(company).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="brand-title" style={{ fontSize: '1rem' }}>{company}</div>
            <div className="meta">{location}</div>
          </div>
        </div>

        <h1>{title}</h1>

        <div className="info" aria-label="Job summary">
          <span>{company}</span>
          <span>•</span>
          <span>{location}</span>
          <span>•</span>
          <span>{type}</span>
          <span>•</span>
          <span>Posted {posted}</span>
          <span>•</span>
          <span>Salary: {formatSalary(salaryMin, salaryMax)}</span>
        </div>

        {Array.isArray(job.tags) && job.tags.length > 0 && (
          <div className="tags" aria-label="Required skills">
            {job.tags.map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        )}

        <div className="separator" />
        <div className="desc">
          {String(job.description || 'No description provided.').split('\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
