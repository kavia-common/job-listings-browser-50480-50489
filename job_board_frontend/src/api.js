import { log } from './theme';
import mockData from './mockJobs.json';
import { loadUserJobs } from './utils/userJobs';

const base = process.env.REACT_APP_API_BASE;

/**
 * Merge API/mock jobs with user-created jobs from localStorage.
 * Ensures IDs are strings for consistency.
 */
function mergeWithUserJobs(sourceJobs) {
  const core = Array.isArray(sourceJobs) ? sourceJobs : [];
  const user = loadUserJobs();
  const normId = (id) => (id != null ? String(id) : '');
  const seen = new Set();
  const merged = [];

  for (const j of core) {
    const id = normId(j.id);
    if (!id) continue;
    if (!seen.has(id)) {
      seen.add(id);
      merged.push({ ...j, id });
    }
  }
  for (const j of user) {
    const id = normId(j.id);
    if (!id) continue;
    if (!seen.has(id)) {
      seen.add(id);
      merged.push({ ...j, id });
    }
  }
  return merged;
}

// PUBLIC_INTERFACE
export async function fetchJobs(signal) {
  /**
   * Fetch jobs from configured API if REACT_APP_API_BASE is set; otherwise or on failure,
   * fall back to bundled mock data. Always merges with locally created user jobs.
   * Returns: { jobs, from: 'api' | 'mock' }
   */
  const endpoint = base ? `${base.replace(/\/$/, '')}/jobs` : null;

  if (endpoint) {
    try {
      const res = await fetch(endpoint, { signal, headers: { Accept: 'application/json' } });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Invalid jobs payload, expected array');
      const merged = mergeWithUserJobs(data);
      log('info', `Loaded ${data.length} jobs from API, ${merged.length - data.length} local user jobs merged`);
      return { jobs: merged, from: 'api' };
    } catch (e) {
      log('warn', `Jobs API unavailable, falling back to mock. Reason: ${e.message}`);
    }
  } else {
    log('info', 'REACT_APP_API_BASE not set, using mock data.');
  }

  const merged = mergeWithUserJobs(mockData);
  return { jobs: merged, from: 'mock' };
}

// PUBLIC_INTERFACE
export async function getJobById(id, signal) {
  /**
   * Get a single job by id using the same pipeline as fetchJobs (API/mock + user jobs).
   * Falls back to scanning mock + user jobs if API is unavailable.
   */
  const { jobs } = await fetchJobs(signal);
  return jobs.find((j) => String(j.id) === String(id)) || null;
}
