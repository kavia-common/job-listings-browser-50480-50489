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
 *     submittedAt: number
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
   * Automatically sets submittedAt timestamp.
   */
  const apps = loadApplications();
  const next = {
    ...apps,
    [jobId]: {
      ...(apps[jobId] || {}),
      ...(data || {}),
      jobId: String(jobId),
      submittedAt: Date.now(),
    },
  };
  saveApplications(next);
  return next[jobId];
}
