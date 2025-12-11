//
// Company Reviews utilities - localStorage backed
// Features:
// - Store per-company reviews arrays keyed by normalized company key
// - CRUD helpers: listCompanyReviews, addReview, deleteReview, updateReview
// - Aggregations: computeAverages
// - Identity & ownership: lightweight ownerId from profile or generated client id
// - My reviews listing across companies
//

const STORAGE_KEY = 'jb_company_reviews_v1';
const OWNER_KEY = 'jb_owner_id_v1';

// PUBLIC_INTERFACE
export function normalizeCompanyKey(companyNameOrId) {
  /** Normalize company key to be URL and storage friendly.
   * Accepts company name or id-like string.
   * Rules:
   * - toString, trim
   * - lowercase
   * - replace spaces and consecutive non-alphanumerics with single dash
   * - trim leading/trailing dashes
   */
  const raw = String(companyNameOrId ?? '').trim().toLowerCase();
  if (!raw) return '';
  return raw
    .replace(/['’`]/g, '') // drop quotes
    .replace(/[^a-z0-9]+/g, '-') // non-alnum -> dash
    .replace(/^-+|-+$/g, ''); // trim dashes
}

function safeParse(json, fallback) {
  try {
    const data = JSON.parse(json);
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const obj = safeParse(raw, {});
  return obj && typeof obj === 'object' ? obj : {};
}

function saveAll(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj || {}));
    return true;
  } catch {
    return false;
  }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// PUBLIC_INTERFACE
export function getLocalOwnerId() {
  /** Return a stable local ownerId used to determine review ownership.
   * It checks:
   * - jb_owner_id_v1 in localStorage, otherwise generates and persists a new id.
   * Note: Profile name/email are stored with a review for display, but ownership
   * relies on this local ownerId to allow edit/delete in this demo.
   */
  let id = '';
  try {
    id = localStorage.getItem(OWNER_KEY) || '';
    if (!id) {
      id = uid();
      localStorage.setItem(OWNER_KEY, id);
    }
  } catch {
    // ignore
  }
  return id;
}

// PUBLIC_INTERFACE
export function listCompanyReviews(companyNameOrId) {
  /** Return array of normalized reviews for a company key (newest first). */
  const key = normalizeCompanyKey(companyNameOrId);
  if (!key) return [];
  const all = loadAll();
  const arr = Array.isArray(all[key]) ? all[key] : [];
  return arr
    .map(normalizeReview)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

// PUBLIC_INTERFACE
export function addReview(company, review) {
  /** Add a new review to a company.
   * review shape:
   *   {
   *     title: string (required),
   *     body: string (required),
   *     ratings: { culture: 1-5, salary: 1-5, workLife: 1-5 } (required),
   *     author?: { name?: string, email?: string },
   *     createdAt?: number
   *   }
   * Returns created review.
   */
  const key = normalizeCompanyKey(company);
  if (!key) throw new Error('Invalid company key.');
  const r = normalizeReview({
    ...review,
    id: uid(),
    companyKey: key,
    ownerId: getLocalOwnerId(),
    createdAt: review?.createdAt || Date.now(),
    updatedAt: Date.now(),
  });
  validateReview(r);
  const all = loadAll();
  const list = Array.isArray(all[key]) ? all[key] : [];
  all[key] = [...list, r];
  saveAll(all);
  dispatchReviewsChange('create', key, r.id, r);
  return r;
}

// PUBLIC_INTERFACE
export function deleteReview(id) {
  /** Delete a review by id across companies. Returns true if removed. */
  const all = loadAll();
  let removed = false;
  for (const key of Object.keys(all)) {
    const arr = Array.isArray(all[key]) ? all[key] : [];
    const next = arr.filter((r) => String(r.id) !== String(id));
    if (next.length !== arr.length) {
      all[key] = next;
      removed = true;
      dispatchReviewsChange('delete', key, String(id), null);
      break;
    }
  }
  if (removed) saveAll(all);
  return removed;
}

// PUBLIC_INTERFACE
export function updateReview(id, patch) {
  /** Update a review by id. Returns updated review or null. */
  const all = loadAll();
  for (const key of Object.keys(all)) {
    const arr = Array.isArray(all[key]) ? all[key] : [];
    const idx = arr.findIndex((r) => String(r.id) === String(id));
    if (idx !== -1) {
      const updated = normalizeReview({ ...arr[idx], ...(patch || {}), updatedAt: Date.now() });
      validateReview(updated);
      arr[idx] = updated;
      all[key] = arr;
      saveAll(all);
      dispatchReviewsChange('update', key, String(id), updated);
      return updated;
    }
  }
  return null;
}

// PUBLIC_INTERFACE
export function computeAverages(reviews) {
  /** Compute average ratings and totals for a list of reviews.
   * Returns { count, culture, salary, workLife, overall }
   */
  const arr = Array.isArray(reviews) ? reviews : [];
  if (arr.length === 0) return { count: 0, culture: 0, salary: 0, workLife: 0, overall: 0 };
  let c = 0, s = 0, w = 0;
  for (const r of arr) {
    const rr = r?.ratings || {};
    c += toRating(rr.culture);
    s += toRating(rr.salary);
    w += toRating(rr.workLife);
  }
  const count = arr.length;
  const culture = round1(c / count);
  const salary = round1(s / count);
  const workLife = round1(w / count);
  const overall = round1((culture + salary + workLife) / 3);
  return { count, culture, salary, workLife, overall };
}

// PUBLIC_INTERFACE
export function listMyReviews() {
  /** Return all reviews across companies authored by current ownerId (newest first). */
  const ownerId = getLocalOwnerId();
  const all = loadAll();
  const items = [];
  for (const key of Object.keys(all)) {
    const arr = Array.isArray(all[key]) ? all[key] : [];
    for (const r of arr) {
      if (String(r.ownerId) === String(ownerId)) items.push(normalizeReview(r));
    }
  }
  return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

function toRating(n) {
  const v = Math.max(1, Math.min(5, parseInt(n || 0, 10) || 0));
  return v >= 1 && v <= 5 ? v : 0;
}

function normalizeReview(r) {
  const rr = r?.ratings || {};
  return {
    id: r?.id || uid(),
    companyKey: normalizeCompanyKey(r?.companyKey || ''),
    title: String(r?.title || '').trim(),
    body: String(r?.body || '').trim(),
    ratings: {
      culture: toRating(rr.culture),
      salary: toRating(rr.salary),
      workLife: toRating(rr.workLife),
    },
    author: r?.author && typeof r.author === 'object'
      ? { name: String(r.author.name || ''), email: String(r.author.email || '') }
      : { name: '', email: '' },
    ownerId: String(r?.ownerId || ''),
    createdAt: Number.isFinite(r?.createdAt) ? r.createdAt : Date.now(),
    updatedAt: Number.isFinite(r?.updatedAt) ? r.updatedAt : Date.now(),
  };
}

function validateReview(r) {
  if (!r.companyKey) throw new Error('companyKey missing');
  if (!r.title) throw new Error('title required');
  if (!r.body) throw new Error('body required');
  const { culture, salary, workLife } = r.ratings || {};
  if (![culture, salary, workLife].every((n) => Number.isFinite(n) && n >= 1 && n <= 5)) {
    throw new Error('ratings must be integers 1..5');
  }
}

function dispatchReviewsChange(action, companyKey, id, review) {
  try {
    window.dispatchEvent(
      new CustomEvent('reviews:change', {
        detail: { action, companyKey, id: String(id), review },
      })
    );
  } catch {
    // noop
  }
}
