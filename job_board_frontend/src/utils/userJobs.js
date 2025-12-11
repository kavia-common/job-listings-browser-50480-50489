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
    paused: false, // default new jobs not paused
    ...job,
    id: job?.id != null && job.id !== '' ? String(job.id) : generateJobId(),
  };
  list.push(withId);
  saveUserJobs(list);
  dispatchUserJobsEvent(withId.id, 'add', withId);
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

/**
 * PUBLIC_INTERFACE
 * Update an existing user job by id. Returns updated job or null.
 */
export function updateUserJob(id, partial) {
  const list = loadUserJobs();
  const idx = list.findIndex((j) => String(j.id) === String(id));
  if (idx === -1) return null;
  const updated = { ...list[idx], ...(partial || {}) };
  list[idx] = updated;
  saveUserJobs(list);
  dispatchUserJobsEvent(String(id), 'update', updated);
  return updated;
}

/**
 * PUBLIC_INTERFACE
 * Delete a user job by id. Returns true if removed.
 */
export function deleteUserJob(id) {
  const list = loadUserJobs();
  const next = list.filter((j) => String(j.id) !== String(id));
  const removed = next.length !== list.length;
  if (removed) {
    saveUserJobs(next);
    dispatchUserJobsEvent(String(id), 'delete', null);
  }
  return removed;
}

/**
 * PUBLIC_INTERFACE
 * Check if a job belongs to the current user's local jobs.
 */
export function isUserOwnedJob(id) {
  return !!findUserJobById(id);
}

/**
 * PUBLIC_INTERFACE
 * Toggle paused flag for a user job.
 */
export function togglePauseJob(id, force) {
  const job = findUserJobById(id);
  if (!job) return null;
  const paused = typeof force === 'boolean' ? !!force : !job.paused;
  return updateUserJob(id, { paused });
}

function generateJobId() {
  // timestamp-random for uniqueness and URL-friendly
  return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
}

function dispatchUserJobsEvent(id, action, job) {
  try {
    window.dispatchEvent(new CustomEvent('userjobs:change', { detail: { id: String(id), action, job } }));
  } catch {
    // ignore
  }
}
