import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchJobs } from '../api';
import { getApplication } from '../utils/applications';

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
   */
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: null, jobs: [] });
  const [showApply, setShowApply] = useState(false);

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
            <button className="button" onClick={onApply} aria-label="Apply to this job">
              {appliedInfo ? 'Update application' : 'Apply'}
            </button>
          </div>
        </div>

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
