const SAVED_JOBS_KEY = 'savedJobs_v1';

/**
 * PUBLIC_INTERFACE
 * Load saved job IDs from localStorage.
 * Returns a Set of string IDs.
 */
export function loadSavedJobs() {
  try {
    const raw = localStorage.getItem(SAVED_JOBS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map(String));
  } catch {
    // ignore
  }
  return new Set();
}

/**
 * Persist saved job IDs to localStorage.
 */
function saveSavedJobsSet(set) {
  try {
    localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(Array.from(set)));
    return true;
  } catch {
    return false;
  }
}

/**
 * PUBLIC_INTERFACE
 * Check if a jobId is saved.
 */
export function isJobSaved(jobId) {
  const set = loadSavedJobs();
  return set.has(String(jobId));
}

/**
 * PUBLIC_INTERFACE
 * Toggle saved state of a jobId. Returns the updated boolean saved state.
 * Dispatches a 'savedjobs:change' event on window for cross-page sync.
 */
export function toggleSavedJob(jobId) {
  const id = String(jobId);
  const set = loadSavedJobs();
  let saved;
  if (set.has(id)) {
    set.delete(id);
    saved = false;
  } else {
    set.add(id);
    saved = true;
  }
  saveSavedJobsSet(set);
  try {
    window.dispatchEvent(new CustomEvent('savedjobs:change', { detail: { id, saved } }));
  } catch {
    // ignore
  }
  return saved;
}

/**
 * PUBLIC_INTERFACE
 * Get array of saved job IDs as strings.
 */
export function getSavedJobsArray() {
  return Array.from(loadSavedJobs());
}
