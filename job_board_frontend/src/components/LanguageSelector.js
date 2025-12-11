import React from 'react';
import i18n, { SUPPORTED_LANGS } from '../i18n';
import { useTranslation } from 'react-i18next';
import '../App.css';

/**
 * PUBLIC_INTERFACE
 * LanguageSelector allows switching between supported languages and persists selection.
 */
export default function LanguageSelector() {
  const { t } = useTranslation();

  const langs = [
    { code: 'en', label: t('lang.short.en', 'EN') },
    { code: 'te', label: t('lang.short.te', 'TE') },
    { code: 'hi', label: t('lang.short.hi', 'HI') }
  ].filter(l => SUPPORTED_LANGS.includes(l.code));

  const current = i18n.language?.slice(0, 2) || 'en';

  const onChange = (e) => {
    const lng = e.target.value;
    i18n.changeLanguage(lng);
  };

  // Ocean Professional theme: subtle border, rounded, blue focus
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span className="muted">{t('lang.label')}</span>
      <select
        aria-label={t('lang.label')}
        value={current}
        onChange={onChange}
        style={{
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid #d1d5db',
          backgroundColor: '#ffffff',
          color: '#111827',
          outline: 'none'
        }}
        className="lang-selector"
      >
        {langs.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
