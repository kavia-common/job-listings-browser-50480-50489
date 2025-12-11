import { log } from './theme';
import mockData from './mockJobs.json';

const base = process.env.REACT_APP_API_BASE;

// PUBLIC_INTERFACE
export async function fetchJobs(signal) {
  /**
   * Fetch jobs from configured API if REACT_APP_API_BASE is set; otherwise or on failure,
   * fall back to bundled mock data.
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
      log('info', `Loaded ${data.length} jobs from API`);
      return { jobs: data, from: 'api' };
    } catch (e) {
      log('warn', `Jobs API unavailable, falling back to mock. Reason: ${e.message}`);
    }
  } else {
    log('info', 'REACT_APP_API_BASE not set, using mock data.');
  }

  return { jobs: mockData, from: 'mock' };
}
