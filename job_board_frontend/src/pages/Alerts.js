import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  listAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  toggleAlert,
  listNotifications,
  getPushPermissionState,
  requestPushPermission,
} from '../utils/alerts';
import { useTranslation } from 'react-i18next';

// PUBLIC_INTERFACE
export default function AlertsPage() {
  /** Alerts page: create and manage alert rules and view recent notifications */
  const { t } = useTranslation();
  const nav = useNavigate();
  const loc = useLocation();
  const prefill = useMemo(() => {
    const sp = new URLSearchParams(loc.search || '');
    return {
      keywords: sp.get('q') || '',
      company: sp.get('company') || '',
      location: sp.get('location') || '',
      category: sp.get('category') || '',
    };
  }, [loc.search]);

  const [rules, setRules] = useState(listAlerts());
  const [notifs, setNotifs] = useState(listNotifications());
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const onChange = () => setRules(listAlerts());
    const onNotif = () => setNotifs(listNotifications());
    window.addEventListener('alerts:change', onChange);
    window.addEventListener('alerts:notify', onNotif);
    return () => {
      window.removeEventListener('alerts:change', onChange);
      window.removeEventListener('alerts:notify', onNotif);
    };
  }, []);

  function onCreate(values) {
    const r = createAlert(values);
    setEditing(null);
    return r;
  }
  function onUpdate(id, patch) {
    const r = updateAlert(id, patch);
    setEditing(null);
    return r;
  }
  function onDelete(id) {
    const ok = window.confirm(t('actions.delete'));
    if (!ok) return;
    deleteAlert(id);
  }

  const empty = rules.length === 0;

  return (
    <div className="main" role="region" aria-label={t('alerts.title')}>
      <div className="detail" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>{t('alerts.title')}</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link className="page-btn" to="/" aria-label={t('nav.jobs')}>← {t('nav.jobs')}</Link>
            <button className="button" onClick={() => setEditing({ mode: 'create', values: { ...prefill, keywords: prefill.keywords || prefill.company || '' } })}>
              + New Alert
            </button>
          </div>
        </div>
        <div className="separator" />
        <p className="meta">
          Create rules to be notified when new jobs match your interests. Channels:
          In‑app (always) and optional Push (browser). Email is simulated in history only (no emails are sent).
        </p>
        <PushStatus />
      </div>

      {editing ? (
        <div className="detail" style={{ marginBottom: 12 }}>
          <RuleForm
            initial={editing.values}
            onCancel={() => setEditing(null)}
            onSubmit={(vals) => {
              if (editing.mode === 'create') onCreate(vals);
              else onUpdate(editing.values.id, vals);
            }}
          />
        </div>
      ) : null}

      <section className="detail" aria-label="Existing rules" style={{ marginBottom: 12 }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Your Rules</h2>
        <div className="separator" />
        {empty ? (
          <div className="meta">{t('alerts.empty')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {rules.map((r) => (
              <RuleRow
                key={r.id}
                rule={r}
                onEdit={() => setEditing({ mode: 'edit', values: r })}
                onToggle={() => toggleAlert(r.id)}
                onDelete={() => onDelete(r.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="detail" aria-label="Recent notifications">
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Recent Notifications</h2>
        <div className="separator" />
        {notifs.length === 0 ? (
          <div className="meta">No notifications yet. When jobs match enabled rules, they will appear here.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {notifs.map((n) => (
              <div key={n.id} className="card" style={{ padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 600 }}>
                    {n.message}
                  </div>
                  <span className="badge" title={n.channel}>{n.channel}</span>
                </div>
                <div className="meta" style={{ marginTop: 4 }}>
                  Job #{n.jobId} • Rule #{n.ruleId} • {new Date(n.time).toLocaleString()}
                </div>
                <div style={{ marginTop: 6 }}>
                  <Link className="link" to={`/jobs/${encodeURIComponent(n.jobId)}`}>Open job →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="meta" style={{ marginTop: 12 }}>
        Note: This demo is serverless. Email notifications are simulated by recording entries in history.
        To wire a real email service later, see the README note.
      </div>
    </div>
  );
}

function RuleRow({ rule, onEdit, onToggle, onDelete }) {
  const ch = [];
  if (rule.channels?.email && rule.email) ch.push(`Email (${rule.email})`);
  if (rule.channels?.push) ch.push('Push');

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700 }}>{rule.name || 'Alert'}</div>
          <div className="meta">
            {rule.keywords?.length ? `Keywords: ${rule.keywords.join(', ')}` : 'Keywords: —'} • Company: {rule.company || '—'} • Location: {rule.location || '—'} • Category: {rule.category || '—'}
          </div>
          <div className="tags" style={{ marginTop: 6 }}>
            <span className="tag">{rule.enabled ? 'Enabled' : 'Disabled'}</span>
            {ch.length ? <span className="tag">{ch.join(' + ')}</span> : <span className="tag">In‑app only</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="page-btn" onClick={onToggle} aria-label={rule.enabled ? 'Disable' : 'Enable'}>
            {rule.enabled ? 'Disable' : 'Enable'}
          </button>
          <button className="page-btn" onClick={onEdit} aria-label="Edit">Edit</button>
          <button className="page-btn" onClick={onDelete} aria-label="Delete" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function RuleForm({ initial, onSubmit, onCancel }) {
  const [keywords, setKeywords] = useState(initial?.keywords ? initial.keywords.join(', ') : (initial?.keywords || ''));
  const [company, setCompany] = useState(initial?.company || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [category, setCategory] = useState(initial?.category || '');
  const [enabled, setEnabled] = useState(initial?.enabled !== false);
  const [emailChecked, setEmailChecked] = useState(!!(initial?.channels?.email || initial?.email));
  const [email, setEmail] = useState(initial?.email || '');
  const [pushChecked, setPushChecked] = useState(!!initial?.channels?.push);
  const [error, setError] = useState('');

  useEffect(() => {
    if (pushChecked && getPushPermissionState() === 'default') {
      // try requesting to minimize friction
      requestPushPermission();
    }
  }, [pushChecked]);

  function submit(e) {
    e.preventDefault();
    const kws = String(keywords || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (kws.length === 0 && !company) {
      setError('Provide at least a keyword or a company.');
      return;
    }
    if (emailChecked && !email) {
      setError('Enter an email address or uncheck Email.');
      return;
    }
    setError('');
    onSubmit({
      name: buildName(kws, company),
      keywords: kws,
      company,
      location,
      category,
      enabled,
      channels: {
        email: emailChecked,
        push: pushChecked,
      },
      email: emailChecked ? email : '',
    });
  }

  return (
    <form onSubmit={submit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label className="visually-hidden" htmlFor="r-key">Keywords</label>
          <input id="r-key" className="input" placeholder="Keywords (comma separated)" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
          <div className="meta" style={{ marginTop: 4 }}>Ex: react, frontend, javascript</div>
        </div>
        <div>
          <label className="visually-hidden" htmlFor="r-company">Company</label>
          <input id="r-company" className="input" placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div>
          <label className="visually-hidden" htmlFor="r-location">Location</label>
          <input id="r-location" className="input" placeholder="Location filter (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <label className="visually-hidden" htmlFor="r-category">Category</label>
          <input id="r-category" className="input" placeholder="Category filter (optional)" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
      </div>

      <div className="separator" />

      <div style={{ display: 'grid', gap: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enable alert
        </label>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={emailChecked} onChange={(e) => setEmailChecked(e.target.checked)} />
            Email
          </label>
          <input
            className="input"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!emailChecked}
            style={{ maxWidth: 280 }}
            aria-label="Email address for alerts"
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={pushChecked} onChange={(e) => setPushChecked(e.target.checked)} />
            Push (browser)
          </label>
          <span className="meta">Permission: {getPushPermissionState()}</span>
        </div>
      </div>

      {error ? <div className="meta" role="alert" style={{ color: 'var(--color-error)', marginTop: 6 }}>{error}</div> : null}

      <div style={{ display: 'flex', justifyContent: 'end', gap: 8, marginTop: 10 }}>
        <button type="button" className="page-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="button">Save</button>
      </div>
    </form>
  );
}

function buildName(kws, company) {
  const parts = [];
  if (kws?.length) parts.push(kws.join(' / '));
  if (company) parts.push(`@ ${company}`);
  return parts.join(' ') || 'New Alert';
}

function PushStatus() {
  const [state, setState] = useState(getPushPermissionState());
  async function req() {
    const res = await requestPushPermission();
    setState(res);
  }
  return (
    <div className="meta" style={{ marginTop: 6 }}>
      Push notifications: {state}. {state === 'default' ? <button className="page-btn" onClick={req} style={{ marginLeft: 8 }}>Request permission</button> : null}
    </div>
  );
}
