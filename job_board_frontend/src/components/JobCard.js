import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isJobSaved, toggleSavedJob } from '../utils/savedJobs';

// PUBLIC_INTERFACE
export default function JobCard({ job }) {
  /** Accessible job summary card with save/unsave (bookmark) toggle */
  const type = job.type || 'Unknown';
  const location = job.location || 'Unspecified';
  const posted = job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'N/A';

  const [saved, setSaved] = useState(isJobSaved(job.id));

  useEffect(() => {
    // sync with cross-tab/page changes
    const onChange = (e) => {
      if (String(e.detail?.id) === String(job.id)) {
        setSaved(Boolean(e.detail?.saved));
      } else {
        // for mass updates, resync
        setSaved(isJobSaved(job.id));
      }
    };
    window.addEventListener('savedjobs:change', onChange);
    return () => window.removeEventListener('savedjobs:change', onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  function onToggleSave() {
    const next = toggleSavedJob(job.id);
    setSaved(next);
  }

  // Minimal icon using text; could be replaced with SVG
  const icon = saved ? '🔖' : '📑';
  const iconTitle = saved ? 'Unsave job' : 'Save job';

  return (
    <article className="card" aria-labelledby={`job-${job.id}-title`}>
      <div className="card-head">
        <div>
          <h3 id={`job-${job.id}-title`} className="card-title">{job.title || 'Untitled role'}</h3>
          <p className="card-sub">{job.company || 'Company'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="badges" aria-label="Job attributes">
            <span className="badge type" aria-label={`Type ${type}`}>{type}</span>
            <span className="badge location" aria-label={`Location ${location}`}>{location}</span>
          </div>
          <button
            className="page-btn"
            aria-pressed={saved}
            onClick={onToggleSave}
            aria-label={iconTitle}
            title={iconTitle}
            style={{
              minWidth: 36,
              height: 36,
              borderColor: saved ? 'rgba(245, 158, 11, 0.35)' : undefined,
              background: saved ? 'rgba(245, 158, 11, 0.12)' : undefined,
              color: saved ? '#b45309' : undefined,
              fontWeight: saved ? 700 : 500,
            }}
          >
            {icon}
          </button>
        </div>
      </div>

      {Array.isArray(job.tags) && job.tags.length > 0 && (
        <div className="tags" aria-label="Tags">
          {job.tags.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      )}

      <div className="card-foot">
        <Link className="link" to={`/jobs/${encodeURIComponent(job.id)}`} aria-label={`View details for ${job.title || 'job'}`}>
          View details →
        </Link>
        <span className="meta" aria-label="Posted date">
          {posted}
        </span>
      </div>
    </article>
  );
}
