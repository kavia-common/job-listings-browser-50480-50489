const APPLICATIONS_KEY = 'jb_applications_v1';

/**
 * Shape:
 * {
 *   [jobId]: {
 *     jobId: string,
 *     fullName: string,
 *     email: string,
 *     resume?: { name, size, type, dataUrl },
 *     coverLetter?: string,
 *     submittedAt: number,
 *     status?: 'submitted' | 'shortlisted' | 'rejected' | 'hired',
 *     lastStatusAt?: number,
 *     jobDeleted?: boolean   // mark when job removed to preserve history without breaking UI
 *   }
 * }
 */

// PUBLIC_INTERFACE
export function loadApplications() {
  /** Load all applications from localStorage with sane defaults */
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // ignore parse errors, return empty
  }
  return {};
}

// PUBLIC_INTERFACE
export function saveApplications(apps) {
  /** Persist all applications to localStorage */
  try {
    const obj = apps && typeof apps === 'object' ? apps : {};
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(obj));
    return true;
  } catch {
    return false;
  }
}

// PUBLIC_INTERFACE
export function getApplication(jobId) {
  /** Get an application for a specific jobId */
  const apps = loadApplications();
  return apps && apps[jobId] ? apps[jobId] : null;
}

// PUBLIC_INTERFACE
export function setApplication(jobId, data) {
  /**
   * Create or update an application for a jobId.
   * Automatically sets submittedAt timestamp for create,
   * and keeps existing submittedAt when updating unless explicitly overridden.
   */
  const apps = loadApplications();
  const existing = apps[jobId] || {};
  const now = Date.now();
  const nextRecord = {
    ...existing,
    ...(data || {}),
    jobId: String(jobId),
    submittedAt: existing.submittedAt || now,
    status: existing.status || 'submitted',
    lastStatusAt: existing.lastStatusAt || existing.submittedAt || now,
  };
  const next = {
    ...apps,
    [jobId]: nextRecord,
  };
  saveApplications(next);
  return next[jobId];
}

// PUBLIC_INTERFACE
export function markApplicationJobDeleted(jobId) {
  /** Mark an application's job as deleted without removing the application record */
  const apps = loadApplications();
  if (!apps[jobId]) return false;
  apps[jobId] = { ...apps[jobId], jobDeleted: true };
  return saveApplications(apps);
}

// PUBLIC_INTERFACE
export function listAllApplications() {
  /** Return application array sorted by submittedAt desc */
  const apps = loadApplications();
  return Object.values(apps || {}).sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
}

/**
 * Convenience helper used by employer interviews page to get applications for a job.
 * Returns an array (0 or 1 record currently, as the model is one application per job).
 */
// PUBLIC_INTERFACE
export function getApplicationsForJob(jobId) {
  const app = getApplication(String(jobId));
  return app ? [app] : [];
}

// PUBLIC_INTERFACE
export function listApplicationsByJob(jobId) {
  /** Return application for a specific jobId as single-element array if exists (current model supports one per job) */
  const app = getApplication(String(jobId));
  return app ? [app] : [];
}

// PUBLIC_INTERFACE
export function updateApplicationStatus(jobId, status) {
  /** Update application status with timestamp */
  const apps = loadApplications();
  if (!apps[jobId]) return false;
  apps[jobId] = {
    ...apps[jobId],
    status,
    lastStatusAt: Date.now(),
  };
  return saveApplications(apps);
}

// PUBLIC_INTERFACE
export function getResumeURL(jobId) {
  /** Return resume dataUrl for the application if available */
  const app = getApplication(String(jobId));
  return app?.resume?.dataUrl || '';
}
