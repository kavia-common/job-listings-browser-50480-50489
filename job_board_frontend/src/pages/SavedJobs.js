import { useEffect, useMemo, useState } from 'react';
import { fetchJobs } from '../api';
import JobCard from '../components/JobCard';
import { getSavedJobsArray } from '../utils/savedJobs';

// PUBLIC_INTERFACE
export default function SavedJobsPage() {
  /**
   * Saved jobs page: lists only saved jobs using JobCard.
   * Syncs with saved state changes via window event.
   */
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [savedIds, setSavedIds] = useState(getSavedJobsArray());

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetchJobs(ctrl.signal)
      .then(({ jobs }) => {
        setAllJobs(Array.isArray(jobs) ? jobs : []);
        setLoading(false);
      })
      .catch((e) => {
        setErr(e.message || 'Failed to load jobs');
        setAllJobs([]);
        setLoading(false);
      });
    const onChange = () => setSavedIds(getSavedJobsArray());
    window.addEventListener('savedjobs:change', onChange);
    return () => {
      ctrl.abort();
      window.removeEventListener('savedjobs:change', onChange);
    };
  }, []);

  const savedSet = useMemo(() => new Set(savedIds.map(String)), [savedIds]);
  const items = useMemo(
    () => allJobs.filter((j) => savedSet.has(String(j.id))),
    [allJobs, savedSet]
  );

  if (loading) {
    return (
      <div className="main">
        <div className="detail" role="status"><strong>Loading saved jobs…</strong></div>
      </div>
    );
  }

  return (
    <div className="main" role="region" aria-label="Saved jobs">
      {items.length === 0 ? (
        <div className="detail">
          <strong>No saved jobs yet</strong>
          <div className="meta">Tap the bookmark icon on a job card or job details to save it here.</div>
        </div>
      ) : (
        <>
          <div className="grid">
            {items.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
          <div className="meta" style={{ marginTop: 8 }}>
            Showing {items.length} saved {items.length === 1 ? 'job' : 'jobs'}.
          </div>
        </>
      )}
    </div>
  );
}
