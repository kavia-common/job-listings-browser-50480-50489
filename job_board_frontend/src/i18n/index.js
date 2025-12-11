import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
import en from './locales/en.json';
import te from './locales/te.json';
import hi from './locales/hi.json';

// Supported languages and defaults
export const SUPPORTED_LANGS = ['en', 'te', 'hi'];
export const DEFAULT_LANG = 'en';

// PUBLIC_INTERFACE
export function detectInitialLanguage() {
  /** Detect initial language from localStorage or browser settings */
  const stored = typeof window !== 'undefined' ? window.localStorage.getItem('lang') : null;
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;

  const navLang =
    (typeof navigator !== 'undefined' &&
      (navigator.languages?.[0] || navigator.language || navigator.userLanguage)) ||
    DEFAULT_LANG;

  const normalized = (navLang || DEFAULT_LANG).toLowerCase().slice(0, 2);
  return SUPPORTED_LANGS.includes(normalized) ? normalized : DEFAULT_LANG;
}

/**
 * PUBLIC_INTERFACE
 * Initializes i18n with bundled translation resources and sensible defaults.
 */
export function initI18n() {
  const initialLang = detectInitialLanguage();

  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        te: { translation: te },
        hi: { translation: hi },
      },
      lng: initialLang,
      fallbackLng: DEFAULT_LANG,
      interpolation: {
        escapeValue: false, // React already escapes
      },
      returnNull: false,
    });

  // Persist language changes
  i18n.on('languageChanged', (lng) => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lang', lng);
      }
      // Set dir attribute for future RTL support (hi/te are LTR, but scaffold is ready)
      const dir = getDirection(lng);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', lng);
      }
    } catch (_) {
      // no-op
    }
  });

  // Initialize dir/lang on load
  const dir = getDirection(initialLang);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', initialLang);
  }

  return i18n;
}

// PUBLIC_INTERFACE
export function getDirection(lng) {
  /** Future-proof for RTL languages like 'ar', 'fa', 'ur'. */
  const rtlLangs = new Set(['ar', 'fa', 'ur', 'he']);
  const base = (lng || '').slice(0, 2).toLowerCase();
  return rtlLangs.has(base) ? 'rtl' : 'ltr';
}

// PUBLIC_INTERFACE
export function formatNumber(n, locale) {
  /** Helper for localized number formatting */
  try {
    return new Intl.NumberFormat(locale || i18n.language).format(n);
  } catch {
    return String(n);
  }
}

// PUBLIC_INTERFACE
export function formatDateTime(date, options, locale) {
  /** Helper for localized date/time formatting (used in Interviews) */
  const d = date instanceof Date ? date : new Date(date);
  const fmtOptions =
    options ||
    ({
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  try {
    return new Intl.DateTimeFormat(locale || i18n.language, fmtOptions).format(d);
  } catch {
    return d.toLocaleString();
  }
}

export default i18n;
