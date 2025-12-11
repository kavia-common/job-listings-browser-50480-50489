//
// Alerts utilities: manage alert rules, notification history, and matching against jobs.
// All client-side using localStorage. Includes push permission helpers.
// Ocean Professional theme friendly, no external services.
//
// Storage keys (versioned):
const ALERTS_KEY = 'jb_alerts_rules_v1';
const ALERTS_NOTIFS_KEY = 'jb_alerts_notifications_v1';

// Helpers
function safeParse(json, fallback) {
  try {
    const data = JSON.parse(json);
    return data ?? fallback;
  } catch {
    return fallback;
  }
}
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function nowIso() {
  return new Date().toISOString();
}

// PUBLIC_INTERFACE
export function listAlerts() {
  /** Return array of alert rules from localStorage (normalized). */
  const raw = localStorage.getItem(ALERTS_KEY);
  const arr = safeParse(raw, []);
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeRule);
}

// PUBLIC_INTERFACE
export function createAlert(rule) {
  /** Create a new alert rule. Returns created rule with id. */
  const rules = listAlerts();
  const r = normalizeRule({
    ...rule,
    id: uid(),
    enabled: rule?.enabled !== false, // default true
  });
  rules.push(r);
  localStorage.setItem(ALERTS_KEY, JSON.stringify(rules));
  dispatchAlertsChange('create', r.id, r);
  return r;
}

// PUBLIC_INTERFACE
export function updateAlert(id, patch) {
  /** Patch an existing rule by id. Returns updated rule or null. */
  const rules = listAlerts();
  const i = rules.findIndex((r) => String(r.id) === String(id));
  if (i === -1) return null;
  const updated = normalizeRule({ ...rules[i], ...(patch || {}) });
  rules[i] = updated;
  localStorage.setItem(ALERTS_KEY, JSON.stringify(rules));
  dispatchAlertsChange('update', updated.id, updated);
  return updated;
}

// PUBLIC_INTERFACE
export function deleteAlert(id) {
  /** Delete a rule by id; returns true if removed. */
  const rules = listAlerts();
  const next = rules.filter((r) => String(r.id) !== String(id));
  const removed = next.length !== rules.length;
  if (removed) {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(next));
    dispatchAlertsChange('delete', String(id), null);
  }
  return removed;
}

// PUBLIC_INTERFACE
export function toggleAlert(id, enabled) {
  /** Toggle a rule's enabled flag (or force to boolean). Returns updated rule or null. */
  const rule = listAlerts().find((r) => String(r.id) === String(id));
  if (!rule) return null;
  const next = typeof enabled === 'boolean' ? !!enabled : !rule.enabled;
  return updateAlert(id, { enabled: next });
}

// PUBLIC_INTERFACE
export function listNotifications(limit = 50) {
  /** List recent notifications from history (most recent first). */
  const raw = localStorage.getItem(ALERTS_NOTIFS_KEY);
  const arr = safeParse(raw, []);
  const list = Array.isArray(arr) ? arr : [];
  // Sort desc by time and clamp
  return list
    .slice()
    .sort((a, b) => (b.time || '').localeCompare(a.time || ''))
    .slice(0, limit);
}

// PUBLIC_INTERFACE
export function recordNotification(event) {
  /** Record a delivered notification to history with dedupeKey (jobId+ruleId). */
  const entry = normalizeNotif(event);
  const raw = localStorage.getItem(ALERTS_NOTIFS_KEY);
  const list = safeParse(raw, []);
  const arr = Array.isArray(list) ? list : [];
  // de-dupe by dedupeKey
  if (entry.dedupeKey && arr.some((e) => e.dedupeKey === entry.dedupeKey)) {
    return false;
  }
  arr.push(entry);
  localStorage.setItem(ALERTS_NOTIFS_KEY, JSON.stringify(arr));
  dispatchAlertsNotif(entry);
  return true;
}

// PUBLIC_INTERFACE
export function getPushPermissionState() {
  /** Get current Notification permission state: 'default' | 'granted' | 'denied' | 'unsupported'. */
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// PUBLIC_INTERFACE
export async function requestPushPermission() {
  /** Request browser notification permission; returns 'granted' | 'denied' | 'default' | 'unsupported'. */
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    const res = await Notification.requestPermission();
    return res;
  } catch {
    return getPushPermissionState();
  }
}

/**
 * Match jobs to alerts rules and return list of new matches that haven't been notified before.
 * Also optionally trigger side-effects: in-app toast and Web Notifications via callbacks.
 *
 * PUBLIC_INTERFACE
 */
export function matchJobsToAlerts(jobs, { notify = true, onInAppNotify, onPushNotify } = {}) {
  /**
   * - jobs: array of job objects with fields { id, title, company, location, category, tags }
   * - notify: if true, record notifications and call channels
   * - onInAppNotify: function({ rule, job, message })
   * - onPushNotify: function({ rule, job, message })
   * Returns array of { ruleId, jobId, message } for updates created in this pass.
   */
  const rules = listAlerts().filter((r) => r.enabled);
  if (!Array.isArray(jobs) || jobs.length === 0 || rules.length === 0) return [];

  const history = listNotifications(1000);
  const deduped = new Set(history.map((h) => h.dedupeKey).filter(Boolean));

  const results = [];
  for (const job of jobs) {
    const jobId = String(job?.id || '');
    if (!jobId) continue;

    for (const rule of rules) {
      if (!ruleMatchesJob(rule, job)) continue;
      const dedupeKey = `${jobId}::${rule.id}`;
      if (deduped.has(dedupeKey)) continue;

      const message = buildMessage(rule, job);
      const record = {
        id: uid(),
        ruleId: rule.id,
        jobId,
        time: nowIso(),
        channel: 'in-app',
        dedupeKey,
        message,
      };

      // in-app is always simulated
      if (notify) {
        recordNotification(record);
        onInAppNotify && onInAppNotify({ rule, job, message });
      }

      // push if allowed and user opted-in
      if (notify && rule.channels?.push === true && getPushPermissionState() === 'granted') {
        try {
          new Notification('New job match', { body: message, icon: undefined, tag: dedupeKey });
        } catch {
          // ignore
        }
        onPushNotify && onPushNotify({ rule, job, message });
      }

      // Email: simulate only by writing to history as channel 'email'
      if (notify && rule.channels?.email === true && rule.email) {
        recordNotification({
          id: uid(),
          ruleId: rule.id,
          jobId,
          time: nowIso(),
          channel: 'email',
          dedupeKey: `email::${dedupeKey}`,
          message: `[Email -> ${rule.email}] ${message}`,
        });
      }

      results.push({ ruleId: rule.id, jobId, message });
      deduped.add(dedupeKey);
    }
  }
  return results;
}

// Implementation details

function normalizeRule(r) {
  const words = (r?.keywords || r?.keyword || '')
    .toString()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const keywords = Array.isArray(r?.keywords) ? r.keywords.filter(Boolean).map(String) : words;
  const channels = {
    email: !!(r?.channels?.email || r?.email),
    push: !!(r?.channels?.push),
  };
  return {
    id: r?.id || uid(),
    name: r?.name ? String(r.name) : buildRuleName({ keywords, company: r?.company }),
    keywords,
    company: r?.company ? String(r.company) : '',
    location: r?.location ? String(r.location) : '',
    category: r?.category ? String(r.category) : '',
    channels,
    email: r?.email ? String(r.email) : '',
    enabled: r?.enabled !== false,
    createdAt: r?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

function buildRuleName({ keywords, company }) {
  const parts = [];
  if (Array.isArray(keywords) && keywords.length) parts.push(keywords.join(' / '));
  if (company) parts.push(`@ ${company}`);
  return parts.join(' ') || 'New Alert';
}

function normalizeNotif(e) {
  const msg = e?.message || 'New job match';
  const ruleId = String(e?.ruleId || '');
  const jobId = String(e?.jobId || '');
  return {
    id: e?.id || uid(),
    ruleId,
    jobId,
    time: e?.time || nowIso(),
    channel: e?.channel || 'in-app',
    message: String(msg),
    dedupeKey: e?.dedupeKey || (ruleId && jobId ? `${jobId}::${ruleId}` : ''),
  };
}

function fieldIncludes(hay, needle) {
  return String(hay || '').toLowerCase().includes(String(needle || '').toLowerCase());
}

function ruleMatchesJob(rule, job) {
  const title = job?.title || '';
  const company = job?.company || '';
  const location = job?.location || '';
  const category = job?.category || job?.tags?.[0] || '';

  // keywords
  const kw = Array.isArray(rule.keywords) ? rule.keywords : [];
  const kwOk =
    kw.length === 0
      ? true
      : kw.some((w) => fieldIncludes(title, w) || fieldIncludes(company, w) || tagsInclude(job, w));

  // company exact/contains
  const companyOk = rule.company ? fieldIncludes(company, rule.company) : true;

  // location contains
  const locationOk = rule.location ? fieldIncludes(location, rule.location) : true;

  // category exact match or contains (case-insensitive)
  const categoryOk = rule.category ? fieldIncludes(category, rule.category) : true;

  return kwOk && companyOk && locationOk && categoryOk;
}

function tagsInclude(job, word) {
  if (!Array.isArray(job?.tags)) return false;
  return job.tags.some((t) => fieldIncludes(t, word));
}

function buildMessage(rule, job) {
  const parts = [];
  if (Array.isArray(rule.keywords) && rule.keywords.length) {
    parts.push(`Matched "${rule.keywords.join(' / ')}"`);
  }
  if (rule.company) parts.push(`Company ${job.company || rule.company}`);
  const title = job.title || 'Job';
  return `${title} • ${parts.join(' • ') || 'New match'}`;
}

function dispatchAlertsChange(action, id, rule) {
  try {
    window.dispatchEvent(new CustomEvent('alerts:change', { detail: { action, id, rule } }));
  } catch {
    // ignore
  }
}
function dispatchAlertsNotif(notif) {
  try {
    window.dispatchEvent(new CustomEvent('alerts:notify', { detail: notif }));
  } catch {
    // ignore
  }
}
