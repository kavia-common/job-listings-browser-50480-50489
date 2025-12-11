export const PROFILE_STORAGE_KEY = 'jb_profile_v1';

// PUBLIC_INTERFACE
export function loadProfile() {
  /** Load profile data from localStorage, falling back to defaults if missing or invalid */
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return getDefaultProfile();
    const parsed = JSON.parse(raw);
    return validateProfile(parsed);
  } catch {
    return getDefaultProfile();
  }
}

// PUBLIC_INTERFACE
export function saveProfile(profile) {
  /** Save profile data to localStorage */
  try {
    const validated = validateProfile(profile);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(validated));
    return true;
  } catch {
    return false;
  }
}

// PUBLIC_INTERFACE
export function getDefaultProfile() {
  /** Default profile structure used on first load or if data is invalid */
  return {
    personal: {
      fullName: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      summary: '',
      website: '',
      linkedin: '',
      github: '',
    },
    resume: {
      name: '',
      size: 0,
      type: '',
      dataUrl: '', // base64 preview for PDF/images
    },
    skills: [], // array of strings
    experience: [], // array of { id, company, role, start, end, current, description }
    education: [], // array of { id, school, degree, field, start, end, description }
  };
}

// PUBLIC_INTERFACE
export function getItem(key) {
  /** Get a JSON value from localStorage by key. Returns parsed value or null if missing/invalid. */
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === 'undefined') return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export function setItem(key, value) {
  /** Set a JSON value into localStorage by key. If value is null/undefined, removes the key. */
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
      return true;
    }
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// PUBLIC_INTERFACE
export function removeItem(key) {
  /** Remove a key from localStorage. */
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function validateProfile(p) {
  const d = getDefaultProfile();
  const result = {
    personal: { ...d.personal, ...(p?.personal || {}) },
    resume: { ...d.resume, ...(p?.resume || {}) },
    skills: Array.isArray(p?.skills) ? p.skills.filter(Boolean).map(String) : [],
    experience: Array.isArray(p?.experience) ? p.experience.map(normalizeExp) : [],
    education: Array.isArray(p?.education) ? p.education.map(normalizeEdu) : [],
  };
  return result;
}

function normalizeExp(e) {
  return {
    id: e?.id || String(Math.random()).slice(2),
    company: e?.company || '',
    role: e?.role || '',
    start: e?.start || '',
    end: e?.end || '',
    current: Boolean(e?.current),
    description: e?.description || '',
  };
}

function normalizeEdu(e) {
  return {
    id: e?.id || String(Math.random()).slice(2),
    school: e?.school || '',
    degree: e?.degree || '',
    field: e?.field || '',
    start: e?.start || '',
    end: e?.end || '',
    description: e?.description || '',
  };
}
