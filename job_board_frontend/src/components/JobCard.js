import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isJobSaved, toggleSavedJob } from '../utils/savedJobs';
import { useTranslation } from 'react-i18next';

// PUBLIC_INTERFACE
export default function JobCard({ job }) {
  /** Accessible job summary card with save/unsave (bookmark) toggle */
  const { t } = useTranslation();
  const type = job.type || 'Unknown';
  const location = job.location || t('job.location');
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
  const iconTitle = saved ? t('job.unsaveJob') : t('job.saveJob');

  return (
    <article className="card" aria-labelledby={`job-${job.id}-title`}>
      <div className="card-head">
        <div>
          <h3 id={`job-${job.id}-title`} className="card-title">{job.title || t('job.details')}</h3>
          <p className="card-sub">{job.company || t('job.company')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="badges" aria-label={t('job.details')}>
            <span className="badge type" aria-label={`Type ${type}`}>{type}</span>
            <span className="badge location" aria-label={`${t('job.location')} ${location}`}>{location}</span>
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
        <Link className="link" to={`/jobs/${encodeURIComponent(job.id)}`} aria-label={`${t('job.details')} - ${job.title || ''}`}>
          {t('job.details')} →
        </Link>
        <span className="meta" aria-label={t('job.posted')}>
          {posted}
        </span>
      </div>
    </article>
  );
}
