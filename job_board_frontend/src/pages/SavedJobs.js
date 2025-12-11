import { useEffect, useMemo, useState } from 'react';
import { fetchJobs } from '../api';
import JobCard from '../components/JobCard';
import { getSavedJobsArray, toggleSavedJob } from '../utils/savedJobs';

// PUBLIC_INTERFACE
export default function SavedJobsPage() {
  /**
   * Saved jobs page: lists only saved jobs using JobCard.
   * Syncs with saved state changes via window event.
   * If a saved job becomes paused/hidden from list, we show an inline note with option to remove from saved.
   */
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [savedIds, setSavedIds] = useState(getSavedJobsArray());

  useEffect(() => {
    const ctrl = new AbortController();
    const load = () => {
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
    };
    load();
    const onChange = () => setSavedIds(getSavedJobsArray());
    const onUserJobs = () => load();
    window.addEventListener('savedjobs:change', onChange);
    window.addEventListener('userjobs:change', onUserJobs);
    return () => {
      ctrl.abort();
      window.removeEventListener('savedjobs:change', onChange);
      window.removeEventListener('userjobs:change', onUserJobs);
    };
  }, []);

  const savedSet = useMemo(() => new Set(savedIds.map(String)), [savedIds]);
  const items = useMemo(
    () => allJobs.filter((j) => savedSet.has(String(j.id))),
    [allJobs, savedSet]
  );

  // Compute missing items (saved but not in list, possibly paused/deleted)
  const missingIds = useMemo(() => {
    const present = new Set(items.map((j) => String(j.id)));
    return savedIds.filter((id) => !present.has(String(id)));
  }, [items, savedIds]);

  if (loading) {
    return (
      <div className="main">
        <div className="detail" role="status"><strong>Loading saved jobs…</strong></div>
      </div>
    );
  }

  return (
    <div className="main" role="region" aria-label="Saved jobs">
      {items.length === 0 && missingIds.length === 0 ? (
        <div className="detail">
          <strong>No saved jobs yet</strong>
          <div className="meta">Tap the bookmark icon on a job card or job details to save it here.</div>
        </div>
      ) : (
        <>
          {missingIds.length > 0 && (
            <div className="detail" style={{ marginBottom: 10 }}>
              <strong>Some saved jobs are currently unavailable</strong>
              <div className="meta">
                They may have been paused or deleted by the poster. You can remove them from your saved list below.
              </div>
              <div className="separator" />
              <div className="tags" aria-label="Unavailable saved jobs">
                {missingIds.map((id) => (
                  <span key={id} className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    Job #{id}
                    <button
                      className="page-btn"
                      onClick={() => toggleSavedJob(id)}
                      aria-label={`Remove saved job ${id}`}
                      title="Remove from saved"
                      style={{ minWidth: 28, height: 28 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          {items.length > 0 && (
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
        </>
      )}
    </div>
  );
}
