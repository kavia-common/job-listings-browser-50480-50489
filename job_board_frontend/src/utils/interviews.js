import { getItem, setItem } from './storage';
import { recordNotification } from './alerts';

/**
 * Storage key for interviews in localStorage
 */
const STORAGE_KEY = 'interviews';

/**
 * Generate a reasonably unique ID for interviews.
 */
function genId() {
  return `int_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Normalize candidate identity into an object with keys for matching.
 */
function normalizeCandidate(candidate) {
  if (!candidate) return null;
  if (typeof candidate === 'string') {
    // treat as email
    return { email: candidate.toLowerCase() };
  }
  const obj = { ...candidate };
  if (obj.email) obj.email = String(obj.email).toLowerCase();
  return obj;
}

function loadAll() {
  const arr = getItem(STORAGE_KEY) || [];
  // basic sanity check
  if (!Array.isArray(arr)) return [];
  return arr;
}

function persistAll(all) {
  setItem(STORAGE_KEY, all);
}

/**
// PUBLIC_INTERFACE
 */
export function listAllInterviews() {
  /** Return all interviews in storage */
  return loadAll();
}

/**
// PUBLIC_INTERFACE
 */
export function listInterviewsByJob(jobId) {
  /** List interviews for a specific job id */
  if (!jobId) return [];
  const all = loadAll();
  return all.filter((i) => i.jobId === jobId);
}

/**
// PUBLIC_INTERFACE
 */
export function listInterviewsForCandidate(candidateKey) {
  /**
   * List interviews for a candidate identified by email or object containing email
   */
  if (!candidateKey) return [];
  const cand = normalizeCandidate(candidateKey);
  if (!cand || !cand.email) return [];
  const all = loadAll();
  return all.filter((i) => i.candidate?.email?.toLowerCase() === cand.email);
}

/**
 * Internal helper to write a notification for interview changes.
 */
function notifyInterviewChange(interview, action) {
  // Dedup key: interviewId + status
  const dedupKey = `${interview.id}:${interview.status}`;
  recordNotification({
    id: dedupKey,
    type: 'interview',
    title: `Interview ${action}`,
    message: `Interview for job ${interview.jobId} with ${interview.candidate?.name || interview.candidate?.email} is now ${interview.status}.`,
    meta: {
      interviewId: interview.id,
      status: interview.status,
      jobId: interview.jobId,
      candidateEmail: interview.candidate?.email || null,
    },
  });

  // Try Web Notifications if available
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(`Interview ${action}`, {
          body: `Status: ${interview.status} - ${new Date(interview.datetimeISO).toLocaleString()}`,
        });
      } catch {
        // ignore
      }
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          try {
            new Notification(`Interview ${action}`, {
              body: `Status: ${interview.status} - ${new Date(interview.datetimeISO).toLocaleString()}`,
            });
          } catch {
            // ignore
          }
        }
      });
    }
  }
}

/**
// PUBLIC_INTERFACE
 */
export function createInterview({
  jobId,
  candidateId,
  candidateEmail,
  candidateName,
  candidate, // optional object {email, name, id}
  datetimeISO,
  mode,
  notes,
  status = 'proposed',
}) {
  /**
   * Create an interview proposal/schedule
   */
  if (!jobId) throw new Error('jobId required');
  const cand =
    normalizeCandidate(
      candidate || {
        id: candidateId,
        email: candidateEmail,
        name: candidateName,
      }
    ) || {};
  if (!cand.email) throw new Error('candidate email required');
  if (!datetimeISO) throw new Error('datetimeISO required');

  const now = new Date().toISOString();
  const interview = {
    id: genId(),
    jobId,
    candidate: {
      id: cand.id || null,
      email: cand.email,
      name: cand.name || cand.email,
    },
    datetimeISO,
    mode: mode || 'Video',
    notes: notes || '',
    status,
    createdAt: now,
    updatedAt: now,
    history: [
      {
        at: now,
        action: 'created',
        status,
      },
    ],
  };

  const all = loadAll();
  all.push(interview);
  persistAll(all);

  notifyInterviewChange(interview, 'created');

  return interview;
}

/**
// PUBLIC_INTERFACE
 */
export function updateInterview(id, patch) {
  /**
   * Update an interview with partial fields; records history and timestamps.
   */
  if (!id) throw new Error('interview id required');
  const all = loadAll();
  const idx = all.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('interview not found');
  const prev = all[idx];
  const now = new Date().toISOString();
  const next = {
    ...prev,
    ...patch,
    updatedAt: now,
  };
  next.history = Array.isArray(prev.history) ? [...prev.history] : [];
  next.history.push({
    at: now,
    action: 'updated',
    status: next.status || prev.status,
    patch,
  });
  all[idx] = next;
  persistAll(all);

  notifyInterviewChange(next, 'updated');

  return next;
}

/**
// PUBLIC_INTERFACE
 */
export function cancelInterview(id) {
  /** Cancel an interview and record in history. */
  const all = loadAll();
  const idx = all.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('interview not found');
  const now = new Date().toISOString();
  const next = {
    ...all[idx],
    status: 'canceled',
    updatedAt: now,
  };
  next.history = Array.isArray(all[idx].history) ? [...all[idx].history] : [];
  next.history.push({
    at: now,
    action: 'canceled',
    status: 'canceled',
  });
  all[idx] = next;
  persistAll(all);

  notifyInterviewChange(next, 'canceled');

  return next;
}

/**
// PUBLIC_INTERFACE
 */
export function rescheduleInterview(id, datetimeISO) {
  /** Reschedule an interview to a new datetime ISO string. */
  if (!datetimeISO) throw new Error('datetimeISO required');
  const all = loadAll();
  const idx = all.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('interview not found');
  const now = new Date().toISOString();
  const next = {
    ...all[idx],
    datetimeISO,
    status: 'rescheduled',
    updatedAt: now,
  };
  next.history = Array.isArray(all[idx].history) ? [...all[idx].history] : [];
  next.history.push({
    at: now,
    action: 'rescheduled',
    status: 'rescheduled',
    newDatetimeISO: datetimeISO,
  });
  all[idx] = next;
  persistAll(all);

  notifyInterviewChange(next, 'rescheduled');

  return next;
}

/**
 * Helper to "schedule" from proposed state.
 */
// PUBLIC_INTERFACE
export function setInterviewScheduled(id) {
  /** Mark a proposed/rescheduled interview as scheduled. */
  const all = loadAll();
  const idx = all.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('interview not found');
  const now = new Date().toISOString();
  const next = {
    ...all[idx],
    status: 'scheduled',
    updatedAt: now,
  };
  next.history = Array.isArray(all[idx].history) ? [...all[idx].history] : [];
  next.history.push({
    at: now,
    action: 'scheduled',
    status: 'scheduled',
  });
  all[idx] = next;
  persistAll(all);

  notifyInterviewChange(next, 'scheduled');

  return next;
}

/**
// PUBLIC_INTERFACE
 */
export function acknowledgeInterview(id) {
  /**
   * Candidate ack - does not change status if canceled; if proposed -> scheduled.
   */
  const all = loadAll();
  const idx = all.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('interview not found');
  const current = all[idx];
  const now = new Date().toISOString();
  let nextStatus = current.status;
  if (current.status === 'proposed') nextStatus = 'scheduled';
  const next = {
    ...current,
    status: nextStatus,
    updatedAt: now,
  };
  next.history = Array.isArray(current.history) ? [...current.history] : [];
  next.history.push({
    at: now,
    action: 'acknowledged',
    status: nextStatus,
  });
  all[idx] = next;
  persistAll(all);

  notifyInterviewChange(next, 'acknowledged');

  return next;
}
