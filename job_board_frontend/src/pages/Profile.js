import { useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';
import { loadProfile, saveProfile, getDefaultProfile } from '../utils/storage';
import { loadApplications } from '../utils/applications';
import { getSkillScores } from '../utils/assessments';
import { log } from '../theme';

function MyReviewsSection() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cleanup = null;
    import('../utils/reviews').then((mod) => {
      setItems(mod.listMyReviews());
      const onChange = () => setItems(mod.listMyReviews());
      window.addEventListener('reviews:change', onChange);
      cleanup = () => window.removeEventListener('reviews:change', onChange);
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <Section title="My Reviews">
      {items.length === 0 ? (
        <div className="meta">You haven't written any company reviews yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((r) => (
            <div key={r.id} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.title}</div>
                  <div className="meta">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <a className="page-btn" href={`/companies/${encodeURIComponent(r.companyKey)}/reviews`}>Open company</a>
                </div>
              </div>
              <div className="separator" />
              <div className="tags">
                <span className="tag">Culture {r.ratings.culture}</span>
                <span className="tag">Salary {r.ratings.salary}</span>
                <span className="tag">Work-life {r.ratings.workLife}</span>
              </div>
              <div className="separator" />
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {r.body.length > 220 ? r.body.slice(0, 220) + '…' : r.body}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// PUBLIC_INTERFACE
export default function Profile() {
  /**
   * Profile management page with tabs and Skill Scores integration:
   * - Personal details
   * - Resume upload with preview/remove
   * - Skills list with add/remove (tags)
   * - Experience & Education CRUD
   * - Applications history
   * - Skill Scores (computed from assessments)
   * Data persists to localStorage as a first pass.
   */
  const [profile, setProfile] = useState(getDefaultProfile());
  const [tab, setTab] = useState('personal');

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  useEffect(() => {
    const ok = saveProfile(profile);
    if (!ok) log('warn', 'Failed saving profile to localStorage');
  }, [profile]);

  const skillScores = useMemo(() => {
    try {
      return getSkillScores();
    } catch {
      return { scoresBySkill: {}, lastUpdated: null };
    }
  }, []);
  const hasScores = !!skillScores && Object.keys(skillScores.scoresBySkill || {}).length > 0;

  return (
    <div className="main">
      <div className="detail" role="region" aria-label="Profile">
        <h1 style={{ marginBottom: 12 }}>Your Profile</h1>

        <TabBar current={tab} onChange={setTab} />

        <div className="separator" />

        {tab === 'personal' && (
          <>
            <SkillScores hasScores={hasScores} skillScores={skillScores} />
            <PersonalForm value={profile.personal} onChange={(v) => setProfile({ ...profile, personal: v })} />
          </>
        )}
        {tab === 'resume' && (
          <ResumeSection value={profile.resume} onChange={(v) => setProfile({ ...profile, resume: v })} />
        )}
        {tab === 'skills' && (
          <SkillsSection value={profile.skills} onChange={(v) => setProfile({ ...profile, skills: v })} />
        )}
        {tab === 'experience' && (
          <ExperienceSection
            value={profile.experience}
            onChange={(v) => setProfile({ ...profile, experience: v })}
          />
        )}
        {tab === 'education' && (
          <EducationSection
            value={profile.education}
            onChange={(v) => setProfile({ ...profile, education: v })}
          />
        )}
        {tab === 'applications' && <ApplicationsSection />}
        {tab === 'myreviews' && <MyReviewsSection />}
        <div className="separator" />
        <div className="meta">
          Looking for new roles? Create <Link className="link" to="/alerts">Job Alerts</Link> to get notified when matches appear.
        </div>
      </div>
    </div>
  );
}

function SkillScores({ hasScores, skillScores }) {
  return (
    <Section title="Skill Scores" actions={<Link className="button" to="/assessments">Take Assessments</Link>}>
      {!hasScores ? (
        <div className="meta">No scores yet. Take assessments to build your skill scores.</div>
      ) : (
        <>
          <div className="tags" aria-label="Skill scores">
            {Object.entries(skillScores.scoresBySkill).map(([skill, info]) => (
              <span key={skill} className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <strong>{skill}</strong>
                <span
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#b45309',
                    padding: '2px 6px',
                    borderRadius: 999,
                    fontSize: 12,
                  }}
                >
                  {info.score}%
                </span>
              </span>
            ))}
          </div>
          <div className="meta" style={{ marginTop: 6 }}>
            Last updated: {skillScores.lastUpdated ? new Date(skillScores.lastUpdated).toLocaleString() : '—'}
          </div>
        </>
      )}
    </Section>
  );
}

function TabBar({ current, onChange }) {
  const tabs = [
    { id: 'personal', label: 'Personal' },
    { id: 'resume', label: 'Resume' },
    { id: 'skills', label: 'Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'applications', label: 'Applications' },
    { id: 'myreviews', label: 'My Reviews' },
  ];
  return (
    <nav aria-label="Profile sections" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          className="page-btn"
          style={{
            height: 36,
            padding: '0 12px',
            background: current === t.id ? 'rgba(37, 99, 235, 0.08)' : '#fff',
            borderColor: current === t.id ? 'rgba(37, 99, 235, 0.35)' : 'var(--color-border)',
            color: current === t.id ? '#1d4ed8' : 'inherit',
            fontWeight: current === t.id ? 700 : 500,
          }}
          aria-current={current === t.id ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

function Field({ id, label, children, hint }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{label}</label>
      {children}
      {hint ? <div className="meta" style={{ marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}

function TextInput({ id, value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      id={id}
      className="input"
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-describedby={id ? `${id}-hint` : undefined}
    />
  );
}

function TextArea({ id, value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      id={id}
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      style={{ height: 'auto', padding: 10, resize: 'vertical' }}
    />
  );
}

function Section({ title, children, actions }) {
  return (
    <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h2>
        {actions || null}
      </div>
      <div className="separator" />
      {children}
    </section>
  );
}

function PersonalForm({ value, onChange }) {
  const v = value || {};
  return (
    <Section title="Personal details">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field id="fullName" label="Full name">
          <TextInput id="fullName" value={v.fullName} onChange={(x) => onChange({ ...v, fullName: x })} placeholder="Jane Doe" />
        </Field>
        <Field id="title" label="Professional title">
          <TextInput id="title" value={v.title} onChange={(x) => onChange({ ...v, title: x })} placeholder="Frontend Engineer" />
        </Field>
        <Field id="email" label="Email">
          <TextInput id="email" type="email" value={v.email} onChange={(x) => onChange({ ...v, email: x })} placeholder="jane@example.com" />
        </Field>
        <Field id="phone" label="Phone">
          <TextInput id="phone" value={v.phone} onChange={(x) => onChange({ ...v, phone: x })} placeholder="+1 555 123 4567" />
        </Field>
        <Field id="location" label="Location">
          <TextInput id="location" value={v.location} onChange={(x) => onChange({ ...v, location: x })} placeholder="Remote / City, State" />
        </Field>
        <Field id="website" label="Website">
          <TextInput id="website" value={v.website} onChange={(x) => onChange({ ...v, website: x })} placeholder="https://example.dev" />
        </Field>
        <Field id="linkedin" label="LinkedIn">
          <TextInput id="linkedin" value={v.linkedin} onChange={(x) => onChange({ ...v, linkedin: x })} placeholder="https://linkedin.com/in/username" />
        </Field>
        <Field id="github" label="GitHub">
          <TextInput id="github" value={v.github} onChange={(x) => onChange({ ...v, github: x })} placeholder="https://github.com/username" />
        </Field>
      </div>
      <Field id="summary" label="Professional summary" hint="A short summary to highlight your background and goals.">
        <TextArea id="summary" value={v.summary} onChange={(x) => onChange({ ...v, summary: x })} placeholder="Experienced frontend engineer with a focus on accessibility and performance..." rows={5} />
      </Field>
    </Section>
  );
}

function ResumeSection({ value, onChange }) {
  const v = value || {};
  const [error, setError] = useState('');

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^(application\/pdf|image\/)/.test(file.type)) {
      setError('Please upload a PDF or image file.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: String(reader.result || ''),
      });
    };
    reader.onerror = () => setError('Failed to read the selected file.');
    reader.readAsDataURL(file);
  }

  return (
    <Section
      title="Resume"
      actions={
        v?.name ? (
          <button className="button secondary" onClick={() => onChange({ name: '', size: 0, type: '', dataUrl: '' })}>
            Remove
          </button>
        ) : null
      }
    >
      <div style={{ display: 'grid', gap: 10 }}>
        <input id="resume" type="file" className="input" onChange={onFile} accept="application/pdf,image/*" aria-label="Upload resume" />
        {error ? <div className="meta" style={{ color: 'var(--color-error)' }}>{error}</div> : null}
        {v?.name ? (
          <div style={{ border: '1px dashed var(--color-border)', borderRadius: 10, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{v.name}</div>
                <div className="meta">{formatBytes(v.size)} • {v.type}</div>
              </div>
              <a className="link" href={v.dataUrl} download={v.name} aria-label="Download resume">Download</a>
            </div>
            <div className="separator" />
            {v.type?.startsWith('image/') ? (
              <img src={v.dataUrl} alt="Resume preview" style={{ maxWidth: '100%', borderRadius: 8 }} />
            ) : v.type === 'application/pdf' ? (
              <object data={v.dataUrl} type="application/pdf" width="100%" height="500" aria-label="PDF preview">
                <p>Your browser cannot display PDF preview. Use the download link above.</p>
              </object>
            ) : (
              <div className="meta">No preview available.</div>
            )}
          </div>
        ) : (
          <div className="meta">No resume uploaded. Accepted: PDF or image files.</div>
        )}
      </div>
    </Section>
  );
}

function SkillsSection({ value, onChange }) {
  const skills = Array.isArray(value) ? value : [];
  const [input, setInput] = useState('');
  const add = () => {
    const s = input.trim();
    if (!s) return;
    if (skills.some((k) => k.toLowerCase() === s.toLowerCase())) {
      setInput('');
      return;
    }
    onChange([...skills, s]);
    setInput('');
  };
  const remove = (s) => onChange(skills.filter((k) => k !== s));

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  }

  return (
    <Section title="Skills">
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Add a skill and press Enter"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Add skill"
          style={{ flex: '1 1 260px' }}
        />
        <button className="button" onClick={add} type="button">Add</button>
      </div>
      {skills.length === 0 ? (
        <div className="meta">No skills added yet.</div>
      ) : (
        <div className="tags" aria-label="Skills">
          {skills.map((s) => (
            <span key={s} className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {s}
              <button
                className="page-btn"
                onClick={() => remove(s)}
                aria-label={`Remove ${s}`}
                title="Remove"
                style={{ minWidth: 28, height: 28 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </Section>
  );
}

function ExperienceSection({ value, onChange }) {
  const items = Array.isArray(value) ? value : [];
  const [draft, setDraft] = useState(blankExp());
  const [editingId, setEditingId] = useState('');

  const startEdit = (it) => {
    setEditingId(it.id);
    setDraft({ ...it });
  };
  const cancelEdit = () => {
    setEditingId('');
    setDraft(blankExp());
  };
  const save = () => {
    if (!draft.company.trim() || !draft.role.trim()) return;
    if (editingId) {
      onChange(items.map((it) => (it.id === editingId ? { ...draft } : it)));
    } else {
      onChange([...items, { ...draft, id: String(Math.random()).slice(2) }]);
    }
    cancelEdit();
  };
  const del = (id) => onChange(items.filter((it) => it.id !== id));

  return (
    <Section
      title="Experience"
      actions={
        editingId ? (
          <button className="button secondary" onClick={cancelEdit}>Cancel edit</button>
        ) : null
      }
    >
      <ExpForm draft={draft} setDraft={setDraft} onSave={save} />
      <div className="separator" />
      {items.length === 0 ? (
        <div className="meta">No experience entries yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((it) => (
            <ItemCard
              key={it.id}
              title={`${it.role || 'Role'} @ ${it.company || 'Company'}`}
              subtitle={`${formatDate(it.start)} – ${it.current ? 'Present' : formatDate(it.end)}`}
              description={it.description}
              onEdit={() => startEdit(it)}
              onDelete={() => del(it.id)}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

function EducationSection({ value, onChange }) {
  const items = Array.isArray(value) ? value : [];
  const [draft, setDraft] = useState(blankEdu());
  const [editingId, setEditingId] = useState('');

  const startEdit = (it) => {
    setEditingId(it.id);
    setDraft({ ...it });
  };
  const cancelEdit = () => {
    setEditingId('');
    setDraft(blankEdu());
  };
  const save = () => {
    if (!draft.school.trim() || !draft.degree.trim()) return;
    if (editingId) {
      onChange(items.map((it) => (it.id === editingId ? { ...draft } : it)));
    } else {
      onChange([...items, { ...draft, id: String(Math.random()).slice(2) }]);
    }
    cancelEdit();
  };
  const del = (id) => onChange(items.filter((it) => it.id !== id));

  return (
    <Section
      title="Education"
      actions={
        editingId ? (
          <button className="button secondary" onClick={cancelEdit}>Cancel edit</button>
        ) : null
      }
    >
      <EduForm draft={draft} setDraft={setDraft} onSave={save} />
      <div className="separator" />
      {items.length === 0 ? (
        <div className="meta">No education entries yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((it) => (
            <ItemCard
              key={it.id}
              title={`${it.degree || 'Degree'} ${it.field ? 'in ' + it.field : ''}`}
              subtitle={`${it.school || 'School'} • ${formatDate(it.start)} – ${formatDate(it.end)}`}
              description={it.description}
              onEdit={() => startEdit(it)}
              onDelete={() => del(it.id)}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

function ItemCard({ title, subtitle, description, onEdit, onDelete }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <div className="meta">{subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="page-btn" onClick={onEdit} aria-label="Edit">Edit</button>
          <button className="page-btn" onClick={onDelete} aria-label="Delete">Delete</button>
        </div>
      </div>
      {description ? (
        <>
          <div className="separator" />
          <div style={{ whiteSpace: 'pre-wrap' }}>{description}</div>
        </>
      ) : null}
    </div>
  );
}

function ExpForm({ draft, setDraft, onSave }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Field id="exp-company" label="Company">
        <TextInput id="exp-company" value={draft.company} onChange={(x) => setDraft({ ...draft, company: x })} placeholder="Company Inc." />
      </Field>
      <Field id="exp-role" label="Role / Title">
        <TextInput id="exp-role" value={draft.role} onChange={(x) => setDraft({ ...draft, role: x })} placeholder="Software Engineer" />
      </Field>
      <Field id="exp-start" label="Start date">
        <TextInput id="exp-start" value={draft.start} onChange={(x) => setDraft({ ...draft, start: x })} placeholder="2023-05" />
      </Field>
      <Field id="exp-end" label="End date">
        <TextInput id="exp-end" value={draft.end} onChange={(x) => setDraft({ ...draft, end: x })} placeholder="2024-11" />
      </Field>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          id="exp-current"
          type="checkbox"
          checked={!!draft.current}
          onChange={(e) => setDraft({ ...draft, current: e.target.checked })}
        />
        <label htmlFor="exp-current">Current role</label>
      </div>
      <div />
      <Field id="exp-desc" label="Description">
        <TextArea id="exp-desc" value={draft.description} onChange={(x) => setDraft({ ...draft, description: x })} placeholder="Responsibilities, achievements, tech stack…" rows={4} />
      </Field>
      <div />
      <div>
        <button className="button" type="button" onClick={onSave}>Save</button>
      </div>
    </div>
  );
}

function EduForm({ draft, setDraft, onSave }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Field id="edu-school" label="School">
        <TextInput id="edu-school" value={draft.school} onChange={(x) => setDraft({ ...draft, school: x })} placeholder="University Name" />
      </Field>
      <Field id="edu-degree" label="Degree">
        <TextInput id="edu-degree" value={draft.degree} onChange={(x) => setDraft({ ...draft, degree: x })} placeholder="B.Sc., M.Sc., etc." />
      </Field>
      <Field id="edu-field" label="Field of study">
        <TextInput id="edu-field" value={draft.field} onChange={(x) => setDraft({ ...draft, field: x })} placeholder="Computer Science" />
      </Field>
      <div />
      <Field id="edu-start" label="Start date">
        <TextInput id="edu-start" value={draft.start} onChange={(x) => setDraft({ ...draft, start: x })} placeholder="2020-09" />
      </Field>
      <Field id="edu-end" label="End date">
        <TextInput id="edu-end" value={draft.end} onChange={(x) => setDraft({ ...draft, end: x })} placeholder="2024-06" />
      </Field>
      <Field id="edu-desc" label="Description">
        <TextArea id="edu-desc" value={draft.description} onChange={(x) => setDraft({ ...draft, description: x })} placeholder="Courses, honors, activities…" rows={4} />
      </Field>
      <div />
      <div>
        <button className="button" type="button" onClick={onSave}>Save</button>
      </div>
    </div>
  );
}

function blankExp() {
  return { id: '', company: '', role: '', start: '', end: '', current: false, description: '' };
}
function blankEdu() {
  return { id: '', school: '', degree: '', field: '', start: '', end: '', description: '' };
}
function formatDate(s) {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (!isNaN(d)) return d.toLocaleDateString();
  } catch {}
  return s;
}
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function ApplicationsSection() {
  const [apps, setApps] = useState({});

  useEffect(() => {
    try {
      setApps(loadApplications());
    } catch {
      setApps({});
    }
  }, []);

  const entries = Object.values(apps || {}).sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

  return (
    <Section title="Applications">
      {entries.length === 0 ? (
        <div className="meta">You haven't applied to any jobs yet. Apply from a job's details page.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {entries.map((a) => (
            <div key={`${a.jobId}-${a.submittedAt}`} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Job #{a.jobId}</div>
                  <div className="meta">
                    Submitted: {new Date(a.submittedAt).toLocaleString()} • {a.fullName} • {a.email}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a className="page-btn" href={`/jobs/${encodeURIComponent(a.jobId)}`} aria-label="View job">Open job</a>
                  <a className="button" href={`/jobs/${encodeURIComponent(a.jobId)}/apply`} aria-label="Update application">Update</a>
                </div>
              </div>
              {a.resume ? (
                <>
                  <div className="separator" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Resume: {a.resume.name}</div>
                      <div className="meta">{formatBytes(a.resume.size)} • {a.resume.type}</div>
                    </div>
                    <a className="link" href={a.resume.dataUrl} download={a.resume.name}>Download</a>
                  </div>
                </>
              ) : null}
              {a.coverLetter ? (
                <>
                  <div className="separator" />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Cover letter</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{a.coverLetter}</div>
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
