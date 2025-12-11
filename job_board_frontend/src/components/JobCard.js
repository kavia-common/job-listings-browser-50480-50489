import { Link } from 'react-router-dom';

// PUBLIC_INTERFACE
export default function JobCard({ job }) {
  /** Accessible job summary card */
  return (
    <article className="card" aria-labelledby={`job-${job.id}-title`}>
      <div className="card-head">
        <div>
          <h3 id={`job-${job.id}-title`} className="card-title">{job.title}</h3>
          <p className="card-sub">{job.company}</p>
        </div>
        <div className="badges" aria-label="Job attributes">
          <span className="badge type" aria-label={`Type ${job.type}`}>{job.type}</span>
          <span className="badge location" aria-label={`Location ${job.location}`}>{job.location}</span>
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
        <Link className="link" to={`/jobs/${encodeURIComponent(job.id)}`} aria-label={`View details for ${job.title}`}>
          View details →
        </Link>
        <span className="meta" aria-label="Posted date">
          {new Date(job.postedAt).toLocaleDateString()}
        </span>
      </div>
    </article>
  );
}
