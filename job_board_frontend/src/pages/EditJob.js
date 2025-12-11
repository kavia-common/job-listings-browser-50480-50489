import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getJobById } from '../api';
import { deleteUserJob, findUserJobById, isUserOwnedJob, togglePauseJob, updateUserJob } from '../utils/userJobs';
import { getSavedJobsArray, toggleSavedJob } from '../utils/savedJobs';
import { markApplicationJobDeleted } from '../utils/applications';

// Helpers for minimal inline validation errors rendering
function Field({ id, label, required, children, error, hint }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
        {label} {required ? <span className="meta" aria-hidden style={{ color: 'var(--color-error)' }}>*</span> : null}
      </label>
      {children}
      {hint ? <div className="meta" style={{ marginTop: 4 }}>{hint}</div> : null}
      {error ? <div className="meta" role="alert" style={{ color: 'var(--color-error)', marginTop: 4 }}>{error}</div> : null}
    </div>
  );
}

// PUBLIC_INTERFACE
export default function EditJob() {
  /** Edit user-posted job; allows updating fields and pause/unpause/delete actions. */
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    getJobById(id, ctrl.signal)
      .then((j) => {
        if (!j || !isUserOwnedJob(String(id))) {
          setError('Job not found or you are not the owner.');
          setJob(null);
        } else {
          setError('');
          setJob(findUserJobById(String(id))); // ensure we have user job version with paused flag
        }
      })
      .catch((e) => {
        setError(e?.message || 'Failed to load job');
        setJob(null);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [id]);

  // Form states
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('Full-time');
  const [category, setCategory] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('not specified');
  const [description, setDescription] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [applyUrl, setApplyUrl] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (job) {
      setTitle(job.title || '');
      setCompany(job.company || '');
      setLocation(job.location || '');
      setType(job.type || 'Full-time');
      setCategory(job.category || '');
      setExperienceLevel(job.experienceLevel || 'not specified');
      setDescription(job.description || '');
      setSalaryMin(Number.isFinite(job.salaryMin) ? String(job.salaryMin) : '');
      setSalaryMax(Number.isFinite(job.salaryMax) ? String(job.salaryMax) : '');
      setApplyUrl(job.applyUrl || job.applyURL || '');
      setTags(Array.isArray(job.tags) ? job.tags : []);
      setPaused(!!job.paused);
    }
  }, [job]);

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.some((k) => k.toLowerCase() === t.toLowerCase())) {
      setTagInput('');
      return;
    }
    setTags([...tags, t]);
    setTagInput('');
  }
  function removeTag(t) {
    setTags(tags.filter((k) => k !== t));
  }
  function onTagKey(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  }

  const [status, setStatus] = useState({ error: '', success: '' });
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    if (!title.trim()) {
      setStatus({ error: 'Title is required.', success: '' });
      return false;
    }
    if (!location.trim()) {
      setStatus({ error: 'Location is required.', success: '' });
      return false;
    }
    if (!description.trim()) {
      setStatus({ error: 'Description is required.', success: '' });
      return false;
    }
    const min = parseInt(salaryMin || '', 10);
    const max = parseInt(salaryMax || '', 10);
    if (!isNaN(min) && !isNaN(max) && min > max) {
      setStatus({ error: 'Minimum salary cannot be greater than maximum salary.', success: '' });
      return false;
    }
    setStatus({ error: '', success: '' });
    return true;
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const updated = updateUserJob(String(id), {
        title: title.trim(),
        company: company.trim() || 'Company',
        location: location.trim(),
        type: type || 'Full-time',
        category: category.trim() || 'general',
        experienceLevel: (experienceLevel || 'not specified').toLowerCase(),
        salaryMin: salaryMin ? parseInt(salaryMin, 10) : undefined,
        salaryMax: salaryMax ? parseInt(salaryMax, 10) : undefined,
        tags: tags,
        description: description.trim(),
        applyUrl: applyUrl.trim() || undefined,
      });
      if (!updated) {
        setStatus({ error: 'Failed to save changes.', success: '' });
      } else {
        setStatus({ error: '', success: 'Job updated. Redirecting…' });
        setTimeout(() => {
          navigate(`/jobs/${encodeURIComponent(id)}`, { replace: true });
        }, 900);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function onTogglePause() {
    const next = togglePauseJob(String(id));
    if (next) setPaused(!!next.paused);
  }

  function onDelete() {
    const ok = window.confirm('Delete this job? This action cannot be undone.');
    if (!ok) return;
    // remove from userJobs
    const removed = deleteUserJob(String(id));
    if (removed) {
      // if saved, remove from saved list
      const saved = getSavedJobsArray();
      if (saved.includes(String(id))) {
        try { toggleSavedJob(String(id)); } catch {}
      }
      // mark application as jobDeleted to preserve history
      try { markApplicationJobDeleted(String(id)); } catch {}
      setStatus({ error: '', success: 'Job deleted. Redirecting…' });
      setTimeout(() => navigate('/', { replace: true }), 700);
    } else {
      setStatus({ error: 'Failed to delete the job.', success: '' });
    }
  }

  if (loading) {
    return (
      <div className="main">
        <div className="detail" role="status"><strong>Loading job…</strong></div>
      </div>
    );
  }
  if (error || !job) {
    return (
      <div className="main">
        <div className="detail" role="alert">
          <strong>Cannot edit this job</strong>
          <div className="meta">{error || 'Job not found.'}</div>
          <div className="separator" />
          <Link className="button" to="/">← Back to list</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main">
      <div className="detail" role="region" aria-label="Edit job">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>Edit Job</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link className="page-btn" to={`/jobs/${encodeURIComponent(id)}`}>Cancel</Link>
            <button className="page-btn" type="button" onClick={onTogglePause} aria-label={paused ? 'Unpause job' : 'Pause job'}>
              {paused ? 'Unpause' : 'Pause'}
            </button>
            <button className="page-btn" type="button" onClick={onDelete} aria-label="Delete job" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}>
              Delete
            </button>
          </div>
        </div>

        {paused ? (
          <div className="meta" role="status" style={{ marginTop: 8, color: '#b45309' }}>
            This job is currently paused and hidden from lists. You can unpause it here.
          </div>
        ) : null}

        <div className="separator" />

        <form onSubmit={onSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field id="ej-title" label="Job title" required>
              <input id="ej-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Frontend Engineer" required />
            </Field>
            <Field id="ej-company" label="Company">
              <input id="ej-company" className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g., BlueWave Labs" />
            </Field>
            <Field id="ej-location" label="Location" required>
              <input id="ej-location" className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Remote or City, State" required />
            </Field>
            <Field id="ej-type" label="Type">
              <select id="ej-type" className="select" value={type} onChange={(e) => setType(e.target.value)}>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
              </select>
            </Field>
            <Field id="ej-category" label="Category" hint="Frontend, backend, data, design, etc.">
              <input id="ej-category" className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., frontend" />
            </Field>
            <Field id="ej-exp" label="Experience level">
              <select id="ej-exp" className="select" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                <option value="internship">Internship</option>
                <option value="entry">Entry</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
                <option value="not specified">Not specified</option>
              </select>
            </Field>
          </div>

          <div className="separator" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field id="ej-smin" label="Salary min">
              <input
                id="ej-smin"
                className="input"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g., 90000"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value.replace(/[^\d]/g, ''))}
              />
            </Field>
            <Field id="ej-smax" label="Salary max">
              <input
                id="ej-smax"
                className="input"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g., 120000"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value.replace(/[^\d]/g, ''))}
              />
            </Field>
          </div>

          <Field id="ej-apply" label="Apply URL" hint="Optional. If provided, Apply will open this link in a new tab.">
            <input id="ej-apply" className="input" value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} placeholder="https://company.example.com/apply/123" />
          </Field>

          <Field id="ej-desc" label="Description" required hint="Provide role responsibilities, requirements, and benefits.">
            <textarea
              id="ej-desc"
              className="input"
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the role…"
              style={{ height: 'auto', padding: 10, resize: 'vertical' }}
              required
            />
          </Field>

          <Field id="ej-tags" label="Required skills (tags)" hint="Press Enter or comma to add a tag.">
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  id="ej-tags"
                  className="input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={onTagKey}
                  placeholder="e.g., React"
                  aria-label="Add required skill"
                  style={{ flex: '1 1 260px' }}
                />
                <button className="button" type="button" onClick={addTag}>Add</button>
              </div>
              {tags.length === 0 ? (
                <div className="meta">No skills added.</div>
              ) : (
                <div className="tags" aria-label="Skills">
                  {tags.map((s) => (
                    <span key={s} className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {s}
                      <button
                        className="page-btn"
                        onClick={() => removeTag(s)}
                        aria-label={`Remove ${s}`}
                        title="Remove"
                        type="button"
                        style={{ minWidth: 28, height: 28 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Field>

          {status.error ? (
            <div className="meta" role="alert" style={{ color: 'var(--color-error)', marginTop: 8 }}>
              {status.error}
            </div>
          ) : null}
          {status.success ? (
            <div className="meta" role="status" style={{ color: 'var(--color-secondary)', marginTop: 8, fontWeight: 700 }}>
              {status.success}
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'end', gap: 8, marginTop: 12 }}>
            <button className="button" type="submit" disabled={submitting} aria-label="Save changes">
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
