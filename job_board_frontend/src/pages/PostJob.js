import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addUserJob } from '../utils/userJobs';
import { getTeam } from '../utils/team';

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
export default function PostJob() {
  /** Post Job page: create a new job listing stored in localStorage (userJobs)
   * When a Team exists, the created job will be team-owned automatically.
   */
  const navigate = useNavigate();

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

  const [status, setStatus] = useState({ error: '', success: '' });
  const [submitting, setSubmitting] = useState(false);

  const team = getTeam();

  const canSubmit = useMemo(() => {
    if (!title.trim() || !location.trim() || !description.trim()) return false;
    const min = parseInt(salaryMin || '', 10);
    const max = parseInt(salaryMax || '', 10);
    if (!isNaN(min) && !isNaN(max) && min > max) return false;
    return true;
  }, [title, location, description, salaryMin, salaryMax]);

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
      const job = addUserJob({
        title: title.trim(),
        company: company.trim() || 'Company',
        location: location.trim(),
        type: type || 'Full-time',
        category: category.trim() || 'general',
        experienceLevel: (experienceLevel || 'not specified').toLowerCase(),
        salaryMin: salaryMin ? parseInt(salaryMin, 10) : undefined,
        salaryMax: salaryMax ? parseInt(salaryMax, 10) : undefined,
        tags: tags,
        postedAt: new Date().toISOString().slice(0, 10),
        description: description.trim(),
        applyUrl: applyUrl.trim() || undefined,
      });
      setStatus({ error: '', success: 'Job posted successfully! Redirecting…' });
      // small notice then redirect to details
      setTimeout(() => {
        navigate(`/jobs/${encodeURIComponent(job.id)}`, { replace: true });
      }, 900);
    } catch (err) {
      setStatus({ error: 'Failed to save the job locally.', success: '' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="main">
      <div className="detail" role="region" aria-label="Post a job">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>Post a Job</h1>
          <button className="button secondary" type="button" onClick={() => navigate(-1)} aria-label="Go back">← Back</button>
        </div>

        {team ? (
          <div className="meta" style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.25)', color: '#1d4ed8', fontWeight: 700 }}>
            This job will be managed by your team.
          </div>
        ) : null}

        <div className="separator" />

        <form onSubmit={onSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field id="pj-title" label="Job title" required>
              <input id="pj-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Frontend Engineer" required />
            </Field>
            <Field id="pj-company" label="Company">
              <input id="pj-company" className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g., BlueWave Labs" />
            </Field>
            <Field id="pj-location" label="Location" required>
              <input id="pj-location" className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Remote or City, State" required />
            </Field>
            <Field id="pj-type" label="Type">
              <select id="pj-type" className="select" value={type} onChange={(e) => setType(e.target.value)}>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
              </select>
            </Field>
            <Field id="pj-category" label="Category" hint="Frontend, backend, data, design, etc.">
              <input id="pj-category" className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., frontend" />
            </Field>
            <Field id="pj-exp" label="Experience level">
              <select id="pj-exp" className="select" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
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
            <Field id="pj-smin" label="Salary min">
              <input
                id="pj-smin"
                className="input"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g., 90000"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value.replace(/[^\d]/g, ''))}
              />
            </Field>
            <Field id="pj-smax" label="Salary max">
              <input
                id="pj-smax"
                className="input"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g., 120000"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value.replace(/[^\d]/g, ''))}
              />
            </Field>
          </div>

          <Field id="pj-apply" label="Apply URL" hint="Optional. If provided, Apply will open this link in a new tab.">
            <input id="pj-apply" className="input" value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} placeholder="https://company.example.com/apply/123" />
          </Field>

          <Field id="pj-desc" label="Description" required hint="Provide role responsibilities, requirements, and benefits.">
            <textarea
              id="pj-desc"
              className="input"
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the role…"
              style={{ height: 'auto', padding: 10, resize: 'vertical' }}
              required
            />
          </Field>

          <Field id="pj-tags" label="Required skills (tags)" hint="Press Enter or comma to add a tag.">
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  id="pj-tags"
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
            <button className="page-btn" type="button" onClick={() => navigate('/')} aria-label="Cancel">
              Cancel
            </button>
            <button className="button" type="submit" disabled={!canSubmit || submitting} aria-label="Post job">
              Post job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
