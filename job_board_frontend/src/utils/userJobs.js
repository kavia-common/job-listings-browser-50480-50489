import { assignJobToTeam, getTeam } from './team';

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
 * Assigns an ID if missing and attaches teamId if a team exists.
 */
export function addUserJob(job) {
  const list = loadUserJobs();
  const teamId = assignJobToTeam(job?.id);
  const withId = {
    paused: false, // default new jobs not paused
    ...job,
    id: job?.id != null && job.id !== '' ? String(job.id) : generateJobId(),
    ...(teamId ? { teamId } : {}),
    createdAt: Date.now(),
    updatedAt: Date.now(),
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
 * Preserves teamId unless explicitly overridden.
 */
export function updateUserJob(id, partial) {
  const list = loadUserJobs();
  const idx = list.findIndex((j) => String(j.id) === String(id));
  if (idx === -1) return null;
  const original = list[idx];
  const updated = {
    ...original,
    ...(partial || {}),
    teamId: partial && Object.prototype.hasOwnProperty.call(partial, 'teamId') ? partial.teamId : original.teamId,
    updatedAt: Date.now(),
  };
  list[idx] = updated;
  saveUserJobs(list);
  dispatchUserJobsEvent(String(id), 'update', updated);
  return updated;
}

/**
 * PUBLIC_INTERFACE
 * Delete a user job by id. Returns true if removed.
 * Honors team ownership: only delete if job is not team-owned or current team matches.
 */
export function deleteUserJob(id) {
  const list = loadUserJobs();
  const job = list.find((j) => String(j.id) === String(id));
  if (!job) return false;

  if (job.teamId) {
    const team = getTeam();
    if (!team || team.id !== job.teamId) {
      return false;
    }
  }

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
 * Toggle paused flag for a user job. Honors team ownership.
 */
export function togglePauseJob(id, force) {
  const list = loadUserJobs();
  const idx = list.findIndex((j) => String(j.id) === String(id));
  if (idx === -1) return null;
  const job = list[idx];

  if (job.teamId) {
    const team = getTeam();
    if (!team || team.id !== job.teamId) {
      return null;
    }
  }

  const paused = typeof force === 'boolean' ? !!force : !job.paused;
  const updated = { ...job, paused, updatedAt: Date.now() };
  list[idx] = updated;
  saveUserJobs(list);
  dispatchUserJobsEvent(String(id), 'update', updated);
  return updated;
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
