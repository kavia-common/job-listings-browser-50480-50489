import { useEffect, useMemo, useState } from 'react';
import { fetchJobs } from '../api';
import JobCard from '../components/JobCard';
import { log } from '../theme';

// PUBLIC_INTERFACE
export default function JobList() {
  /**
   * Job list page: search, filters and paginated results.
   */
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [location, setLocation] = useState('all');
  const [status, setStatus] = useState({ loading: true, error: null, from: null });
  const [jobs, setJobs] = useState([]);

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    const ctrl = new AbortController();
    setStatus({ loading: true, error: null, from: null });
    fetchJobs(ctrl.signal)
      .then(({ jobs: data, from }) => {
        setJobs(data);
        setStatus({ loading: false, error: null, from });
        log('debug', 'Jobs loaded from', from);
      })
      .catch((e) => {
        setStatus({ loading: false, error: e.message, from: null });
      });
    return () => ctrl.abort();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      const matchesQ = q
        ? [j.title, j.company, j.location, ...(j.tags || [])]
            .filter(Boolean)
            .some((f) => String(f).toLowerCase().includes(q))
        : true;
      const matchesType = type === 'all' ? true : String(j.type).toLowerCase() === type;
      const matchesLoc = location === 'all' ? true : String(j.location).toLowerCase().includes(location);
      return matchesQ && matchesType && matchesLoc;
    });
  }, [jobs, query, type, location]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    // reset to page 1 when filters change
    setPage(1);
  }, [query, type, location]);

  const uniqueLocations = useMemo(() => {
    const set = new Set(jobs.map((j) => j.location.toLowerCase()));
    return Array.from(set).sort();
  }, [jobs]);

  if (status.loading) {
    return (
      <div className="main">
        <div role="status" aria-live="polite" className="detail">
          <strong>Loading jobs…</strong>
          <div className="meta">Please wait while we fetch listings.</div>
        </div>
      </div>
    );
  }

  if (status.error) {
    return (
      <div className="main">
        <div role="alert" className="detail" aria-live="assertive">
          <strong>Failed to load jobs</strong>
          <div className="meta">{status.error}</div>
          <div className="separator" />
          <div className="meta">Using local mock data if available.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="controls" aria-label="Search and filters">
        <label className="visually-hidden" htmlFor="search">Search</label>
        <input
          id="search"
          className="input"
          type="search"
          placeholder="Search title, company, tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search jobs"
        />

        <label className="visually-hidden" htmlFor="jobtype">Job type</label>
        <select
          id="jobtype"
          className="select"
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Filter by job type"
        >
          <option value="all">All types</option>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="contract">Contract</option>
        </select>

        <label className="visually-hidden" htmlFor="location">Location</label>
        <select
          id="location"
          className="select"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          aria-label="Filter by location"
        >
          <option value="all">All locations</option>
          {uniqueLocations.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>

        <button className="button" type="button" onClick={() => { setQuery(''); setType('all'); setLocation('all'); }}>
          Reset
        </button>
      </section>

      <div className="main" role="region" aria-label="Job results">
        {jobs.length === 0 ? (
          <div className="detail">
            <strong>No jobs available.</strong>
            <div className="meta">There are currently no job listings to display. If you expected data from an API, ensure REACT_APP_API_BASE is configured. Otherwise mock data should load by default.</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="detail">
            <strong>No jobs match your filters.</strong>
            <div className="meta">Try adjusting your search or filters.</div>
          </div>
        ) : (
          <>
            <div className="grid">
              {pageItems.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
            <nav className="pagination" aria-label="Pagination">
              {Array.from({ length: totalPages }).map((_, i) => {
                const pg = i + 1;
                return (
                  <button
                    key={pg}
                    className="page-btn"
                    onClick={() => setPage(pg)}
                    aria-current={pg === currentPage ? 'page' : undefined}
                    aria-label={`Go to page ${pg}`}
                  >
                    {pg}
                  </button>
                );
              })}
            </nav>
            <div className="meta" style={{ marginTop: 6 }}>
              Source: {status.from === 'api' ? 'Live API' : 'Mock data'}
            </div>
          </>
        )}
      </div>
    </>
  );
}
