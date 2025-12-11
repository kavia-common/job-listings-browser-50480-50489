import { useEffect, useMemo, useState } from 'react';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { fetchJobs } from '../api';
import JobCard from '../components/JobCard';
import { log } from '../theme';

/**
 * Parse query params to an object with defaults and safety.
 */
function useQueryParams() {
  const loc = useRouterLocation();
  return useMemo(() => {
    const sp = new URLSearchParams(loc.search || '');
    return {
      q: sp.get('q') || '',
      type: sp.get('type') || 'all',
      location: sp.get('location') || 'all',
      category: sp.get('category') || 'all',
      minSalary: sp.get('minSalary') || '',
      maxSalary: sp.get('maxSalary') || '',
      exp: sp.get('exp') || 'all',
      page: Math.max(1, parseInt(sp.get('page') || '1', 10) || 1),
    };
  }, [loc.search]);
}

/** Persist and restore filters from localStorage with namespaced key */
const FILTERS_KEY = 'jb_filters_v1';

function loadSavedFilters() {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return {
      q: String(p.q || ''),
      type: String(p.type || 'all'),
      location: String(p.location || 'all'),
      category: String(p.category || 'all'),
      minSalary: String(p.minSalary || ''),
      maxSalary: String(p.maxSalary || ''),
      exp: String(p.exp || 'all'),
      page: Math.max(1, parseInt(p.page || 1, 10) || 1),
    };
  } catch {
    return null;
  }
}

function saveFilters(f) {
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(f));
  } catch {
    // ignore
  }
}

function normalizeJob(j) {
  // Normalize fields to ensure safe filtering with fallbacks
  const category = j.category || (Array.isArray(j.tags) && j.tags[0]) || 'General';
  const salaryMin = Number.isFinite(j.salaryMin) ? j.salaryMin : (j.salary && j.salary.min ? Number(j.salary.min) : undefined);
  const salaryMax = Number.isFinite(j.salaryMax) ? j.salaryMax : (j.salary && j.salary.max ? Number(j.salary.max) : undefined);
  const experienceLevel = j.experienceLevel || j.experience || 'Not specified';
  return {
    ...j,
    category,
    salaryMin: Number.isFinite(salaryMin) ? salaryMin : undefined,
    salaryMax: Number.isFinite(salaryMax) ? salaryMax : undefined,
    experienceLevel,
  };
}

// PUBLIC_INTERFACE
export default function JobList() {
  /**
   * Job list page: search, filters and paginated results.
   * Adds filters: location, category, salary range, experience level.
   * Persists filters to localStorage and URL query params.
   */
  const nav = useNavigate();
  const fromQuery = useQueryParams();
  const saved = loadSavedFilters();

  // initialize from query params first, then saved filters as fallback
  const [query, setQuery] = useState(fromQuery.q ?? (saved?.q ?? ''));
  const [type, setType] = useState(fromQuery.type ?? (saved?.type ?? 'all'));
  const [location, setLocation] = useState(fromQuery.location ?? (saved?.location ?? 'all'));
  const [category, setCategory] = useState(fromQuery.category ?? (saved?.category ?? 'all'));
  const [minSalary, setMinSalary] = useState(fromQuery.minSalary ?? (saved?.minSalary ?? ''));
  const [maxSalary, setMaxSalary] = useState(fromQuery.maxSalary ?? (saved?.maxSalary ?? ''));
  const [experience, setExperience] = useState(fromQuery.exp ?? (saved?.exp ?? 'all'));
  const [page, setPage] = useState(fromQuery.page ?? (saved?.page ?? 1));

  const [status, setStatus] = useState({ loading: true, error: null, from: null });
  const [jobs, setJobs] = useState([]);

  const pageSize = 6;

  // Load jobs
  useEffect(() => {
    const ctrl = new AbortController();
    setStatus({ loading: true, error: null, from: null });
    fetchJobs(ctrl.signal)
      .then(({ jobs: data, from }) => {
        setJobs(Array.isArray(data) ? data.map(normalizeJob) : []);
        setStatus({ loading: false, error: null, from });
        log('debug', 'Jobs loaded from', from);
      })
      .catch((e) => {
        setStatus({ loading: false, error: e.message, from: null });
      });
    return () => ctrl.abort();
  }, []);

  // Build unique options
  const uniqueLocations = useMemo(() => {
    const set = new Set(
      jobs.map((j) => String(j.location || '').toLowerCase()).filter((x) => x && x !== 'null' && x !== 'undefined')
    );
    return Array.from(set).sort();
  }, [jobs]);

  const uniqueCategories = useMemo(() => {
    const set = new Set(
      jobs.map((j) => String(j.category || '').toLowerCase()).filter((x) => x && x !== 'null' && x !== 'undefined')
    );
    return Array.from(set).sort();
  }, [jobs]);

  // Apply filter logic
  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    const locVal = String(location || 'all').toLowerCase();
    const typeVal = String(type || 'all').toLowerCase();
    const catVal = String(category || 'all').toLowerCase();
    const expVal = String(experience || 'all').toLowerCase();

    const min = parseInt(minSalary || '', 10);
    const max = parseInt(maxSalary || '', 10);
    const hasMin = !isNaN(min);
    const hasMax = !isNaN(max);

    return jobs.filter((j) => {
      const matchesQ = q
        ? [j.title, j.company, j.location, j.category, j.experienceLevel, ...(j.tags || [])]
            .filter(Boolean)
            .some((f) => String(f).toLowerCase().includes(q))
        : true;

      const matchesType =
        typeVal === 'all' ? true : String(j.type || '').toLowerCase() === typeVal;

      const matchesLoc =
        locVal === 'all' ? true : String(j.location || '').toLowerCase().includes(locVal);

      const matchesCat =
        catVal === 'all' ? true : String(j.category || '').toLowerCase() === catVal;

      const matchesExp =
        expVal === 'all'
          ? true
          : String(j.experienceLevel || 'Not specified').toLowerCase() === expVal;

      // Salary: if job has no salary info, include only if no salary filter is applied
      let matchesSalary = true;
      const jMin = Number.isFinite(j.salaryMin) ? j.salaryMin : undefined;
      const jMax = Number.isFinite(j.salaryMax) ? j.salaryMax : undefined;
      if (hasMin || hasMax) {
        if (jMin == null && jMax == null) {
          matchesSalary = false;
        } else {
          // overlap check between [jMin, jMax] and [min, max]
          const low = hasMin ? min : Number.NEGATIVE_INFINITY;
          const high = hasMax ? max : Number.POSITIVE_INFINITY;
          const a = jMin != null ? jMin : jMax != null ? jMax : 0;
          const b = jMax != null ? jMax : jMin != null ? jMin : 0;
          const jobLow = Math.min(a, b);
          const jobHigh = Math.max(a, b);
          matchesSalary = jobHigh >= low && jobLow <= high;
        }
      }

      return matchesQ && matchesType && matchesLoc && matchesCat && matchesExp && matchesSalary;
    });
  }, [jobs, query, type, location, category, minSalary, maxSalary, experience]);

  // Pagination based on filtered results
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [query, type, location, category, minSalary, maxSalary, experience]);

  // Persist filters to localStorage
  useEffect(() => {
    saveFilters({ q: query, type, location, category, minSalary, maxSalary, exp: experience, page });
  }, [query, type, location, category, minSalary, maxSalary, experience, page]);

  // Sync filters to URL for shareable links
  useEffect(() => {
    const sp = new URLSearchParams();
    if (query) sp.set('q', query);
    if (type && type !== 'all') sp.set('type', type);
    if (location && location !== 'all') sp.set('location', location);
    if (category && category !== 'all') sp.set('category', category);
    if (minSalary) sp.set('minSalary', String(minSalary));
    if (maxSalary) sp.set('maxSalary', String(maxSalary));
    if (experience && experience !== 'all') sp.set('exp', experience);
    if (currentPage > 1) sp.set('page', String(currentPage));

    const queryStr = sp.toString();
    nav({ search: queryStr ? `?${queryStr}` : '' }, { replace: true });
  }, [query, type, location, category, minSalary, maxSalary, experience, currentPage, nav]);

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

  const clearAll = () => {
    setQuery('');
    setType('all');
    setLocation('all');
    setCategory('all');
    setMinSalary('');
    setMaxSalary('');
    setExperience('all');
  };

  return (
    <>
      <section className="controls" aria-label="Search and filters">
        <a className="button secondary" href="/saved" style={{ display: 'none' }} aria-hidden>Saved</a>
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

        <button className="button" type="button" onClick={clearAll} aria-label="Clear filters">
          Clear
        </button>
      </section>

      {/* Secondary controls row for category, salary range, experience */}
      <section className="controls" aria-label="Additional filters" style={{ marginTop: 10 }}>
        <label className="visually-hidden" htmlFor="category">Category</label>
        <select
          id="category"
          className="select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {uniqueCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 8 }}>
          <label className="visually-hidden" htmlFor="minSalary">Min salary</label>
          <input
            id="minSalary"
            className="input"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Min salary"
            value={minSalary}
            onChange={(e) => setMinSalary(e.target.value.replace(/[^\d]/g, ''))}
            aria-label="Minimum salary"
          />
          <label className="visually-hidden" htmlFor="maxSalary">Max salary</label>
          <input
            id="maxSalary"
            className="input"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Max salary"
            value={maxSalary}
            onChange={(e) => setMaxSalary(e.target.value.replace(/[^\d]/g, ''))}
            aria-label="Maximum salary"
          />
        </div>

        <label className="visually-hidden" htmlFor="experience">Experience level</label>
        <select
          id="experience"
          className="select"
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          aria-label="Filter by experience level"
        >
          <option value="all">All levels</option>
          <option value="internship">Internship</option>
          <option value="entry">Entry</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead</option>
          <option value="not specified">Not specified</option>
        </select>

        <div className="button secondary" role="status" aria-live="polite">
          {filtered.length} results
        </div>
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
