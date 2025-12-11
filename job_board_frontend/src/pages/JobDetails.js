import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchJobs } from '../api';

// PUBLIC_INTERFACE
export default function JobDetails() {
  /**
   * Displays details for a single job by id.
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

  const job = useMemo(() => state.jobs.find((j) => String(j.id) === String(id)), [state.jobs, id]);

  if (state.loading) {
    return (
      <div className="main">
        <div className="detail" role="status" aria-live="polite">
          <strong>Loading job…</strong>
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

  return (
    <div className="main">
      <div className="detail">
        <button className="button secondary" onClick={() => navigate(-1)} aria-label="Go back">
          ← Back
        </button>
        <div className="separator" />
        <h1>{job.title}</h1>
        <div className="info" aria-label="Job summary">
          <span>{job.company}</span>
          <span>•</span>
          <span>{job.location}</span>
          <span>•</span>
          <span>{job.type}</span>
          <span>•</span>
          <span>Posted {new Date(job.postedAt).toLocaleDateString()}</span>
        </div>
        {Array.isArray(job.tags) && job.tags.length > 0 && (
          <div className="tags" aria-label="Tags">
            {job.tags.map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        )}
        <div className="separator" />
        <div className="desc">
          {String(job.description || '').split('\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
