import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchJobs } from '../api';

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

  function onApply() {
    if (applyUrl && /^https?:\/\//i.test(String(applyUrl))) {
      window.open(applyUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Open themed placeholder modal
      setShowApply(true);
    }
  }

  return (
    <div className="main">
      <div className="detail" role="region" aria-label="Job details">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <button className="button secondary" onClick={() => navigate(-1)} aria-label="Go back">
            ← Back
          </button>
          <button className="button" onClick={onApply} aria-label="Apply to this job">
            Apply
          </button>
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

        {/* Simple themed modal for Apply placeholder */}
        {showApply && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Apply dialog"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(17,24,39,0.35)',
              display: 'grid',
              placeItems: 'center',
              padding: 16,
              zIndex: 50,
            }}
            onClick={() => setShowApply(false)}
          >
            <div
              className="detail"
              style={{
                maxWidth: 520,
                width: '100%',
                boxShadow: 'var(--shadow-md)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ marginTop: 0 }}>Apply to {company}</h2>
              <div className="meta" style={{ marginBottom: 10 }}>
                This is a placeholder action. Provide an external apply URL in the job data (applyUrl) to open it directly.
              </div>
              <div style={{ display: 'flex', justifyContent: 'end', gap: 8 }}>
                <button className="page-btn" onClick={() => setShowApply(false)}>Close</button>
                {applyUrl ? (
                  <a
                    className="button"
                    href={applyUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label="Open external apply link"
                  >
                    Open link
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
