const USER_JOBS_KEY = 'userJobs';

/**
 * PUBLIC_INTERFACE
 * Load user-created jobs from localStorage.
 * Returns an array of job objects or [].
 */
export function loadUserJobs() {
  try {
    const raw = localStorage.getItem(USER_JOBS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch {
    // ignore parse errors
  }
  return [];
}

/**
 * PUBLIC_INTERFACE
 * Save an array of user jobs to localStorage.
 */
export function saveUserJobs(jobs) {
  try {
    const arr = Array.isArray(jobs) ? jobs : [];
    localStorage.setItem(USER_JOBS_KEY, JSON.stringify(arr));
    return true;
  } catch {
    return false;
  }
}

/**
 * PUBLIC_INTERFACE
 * Add a new user job. Returns the created job.
 * Assigns an ID if missing.
 */
export function addUserJob(job) {
  const list = loadUserJobs();
  const withId = {
    ...job,
    id: job?.id != null && job.id !== '' ? String(job.id) : generateJobId(),
  };
  list.push(withId);
  saveUserJobs(list);
  // Fire a simple event to allow pages to refresh if needed
  try {
    window.dispatchEvent(new CustomEvent('userjobs:change', { detail: { id: withId.id, action: 'add' } }));
  } catch {
    // ignore
  }
  return withId;
}

/**
 * PUBLIC_INTERFACE
 * Find a job by ID across user jobs list.
 */
export function findUserJobById(id) {
  const list = loadUserJobs();
  return list.find((j) => String(j.id) === String(id)) || null;
}

function generateJobId() {
  // timestamp-random for uniqueness and URL-friendly
  return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
}
