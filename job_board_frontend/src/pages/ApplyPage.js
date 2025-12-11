import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchJobs } from '../api';
import { loadProfile, getDefaultProfile } from '../utils/storage';
import { getApplication, setApplication } from '../utils/applications';

// Helper: format file size
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// PUBLIC_INTERFACE
export default function ApplyPage() {
  /**
   * A dedicated route for applying to a job:
   * - Prefills applicant info from Profile (if present)
   * - Allows uploading resume and entering a cover letter
   * - Validates that at least resume or cover letter is provided
   * - Prevents duplicate without warning, but shows 'already applied' status and allows updating
   * - Persists to localStorage keyed by jobId under jb_applications_v1
   */
  const { id } = useParams();
  const navigate = useNavigate();
  const [jobsState, setJobsState] = useState({ loading: true, error: null, jobs: [] });
  const [profile, setProfile] = useState(getDefaultProfile());

  useEffect(() => {
    const ctrl = new AbortController();
    fetchJobs(ctrl.signal)
      .then(({ jobs }) => setJobsState({ loading: false, error: null, jobs }))
      .catch((e) => setJobsState({ loading: false, error: e.message, jobs: [] }));
    try {
      setProfile(loadProfile());
    } catch {
      setProfile(getDefaultProfile());
    }
    return () => ctrl.abort();
  }, []);

  const job = useMemo(
    () => jobsState.jobs.find((j) => String(j.id) === String(id)),
    [jobsState.jobs, id]
  );

  const existing = useMemo(() => getApplication(String(id)), [id]);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [resume, setResume] = useState(null); // { name, size, type, dataUrl }
  const [coverLetter, setCoverLetter] = useState('');
  const [status, setStatus] = useState({ error: '', success: '' });
  const [submitting, setSubmitting] = useState(false);

  // Prefill from profile or existing application
  useEffect(() => {
    if (existing) {
      setFullName(existing.fullName || '');
      setEmail(existing.email || '');
      setCoverLetter(existing.coverLetter || '');
      setResume(existing.resume || null);
    } else if (profile?.personal) {
      setFullName(profile.personal.fullName || '');
      setEmail(profile.personal.email || '');
      // If profile has resume, suggest it
      if (profile.resume?.dataUrl) {
        setResume({
          name: profile.resume.name,
          size: profile.resume.size,
          type: profile.resume.type,
          dataUrl: profile.resume.dataUrl,
        });
      }
    }
  }, [existing, profile]);

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^(application\/pdf|image\/)/.test(file.type)) {
      setStatus({ error: 'Please upload a PDF or image file for resume.', success: '' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setResume({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: String(reader.result || ''),
      });
      setStatus({ error: '', success: '' });
    };
    reader.onerror = () => setStatus({ error: 'Failed to read selected file.', success: '' });
    reader.readAsDataURL(file);
  }

  function onRemoveResume() {
    setResume(null);
  }

  function validate() {
    if (!resume && !String(coverLetter || '').trim()) {
      setStatus({
        error: 'Please attach a resume or write a cover letter to proceed.',
        success: '',
      });
      return false;
    }
    if (!String(fullName || '').trim()) {
      setStatus({ error: 'Full name is required.', success: '' });
      return false;
    }
    if (!String(email || '').trim()) {
      setStatus({ error: 'Email is required.', success: '' });
      return false;
    }
    return true;
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const saved = setApplication(String(id), {
        fullName: String(fullName || '').trim(),
        email: String(email || '').trim(),
        resume: resume || undefined,
        coverLetter: String(coverLetter || '').trim(),
      });
      setStatus({
        error: '',
        success: existing
          ? 'Application updated successfully.'
          : 'Application submitted successfully.',
      });
      // Simple UX: navigate back to job details after short delay
      setTimeout(() => {
        navigate(`/jobs/${encodeURIComponent(id)}`, { replace: true });
      }, 900);
    } catch (err) {
      setStatus({ error: 'Failed to save the application locally.', success: '' });
    } finally {
      setSubmitting(false);
    }
  }

  if (jobsState.loading) {
    return (
      <div className="main">
        <div className="detail" role="status"><strong>Loading…</strong></div>
      </div>
    );
  }
  if (jobsState.error || !job) {
    return (
      <div className="main">
        <div className="detail" role="alert">
          <strong>Job not found</strong>
          <div className="meta">{jobsState.error || 'The job may have been removed.'}</div>
          <div className="separator" />
          <Link className="button" to="/">← Back to list</Link>
        </div>
      </div>
    );
  }

  const appliedInfo = existing
    ? `You applied on ${new Date(existing.submittedAt).toLocaleString()}`
    : null;

  return (
    <div className="main">
      <div className="detail" role="region" aria-label="Apply to job">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <Link className="button secondary" to={`/jobs/${encodeURIComponent(id)}`} aria-label="Back to job">
            ← Back
          </Link>
          <div className="meta">
            {appliedInfo ? (
              <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{appliedInfo} • You can update your application below.</span>
            ) : (
              <span>Apply to this role using your profile details.</span>
            )}
          </div>
        </div>

        <div className="separator" />

        <h1 style={{ marginTop: 0 }}>{job.title || 'Untitled role'}</h1>
        <div className="info">
          <span>{job.company || 'Company'}</span>
          <span>•</span>
          <span>{job.location || 'Unspecified'}</span>
          <span>•</span>
          <span>{job.type || 'Unknown'}</span>
        </div>

        <form onSubmit={onSubmit} style={{ marginTop: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label htmlFor="ap-fullName" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Full name
              </label>
              <input
                id="ap-fullName"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div>
              <label htmlFor="ap-email" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Email
              </label>
              <input
                id="ap-email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                required
              />
            </div>
          </div>

          <div className="separator" />

          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <label htmlFor="ap-resume" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Resume (PDF or image)
              </label>
              <input
                id="ap-resume"
                type="file"
                className="input"
                onChange={onFile}
                accept="application/pdf,image/*"
                aria-label="Upload resume"
              />
              {resume ? (
                <div style={{ border: '1px dashed var(--color-border)', borderRadius: 10, padding: 10, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{resume.name}</div>
                      <div className="meta">{formatBytes(resume.size)} • {resume.type}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a className="link" href={resume.dataUrl} download={resume.name} aria-label="Download resume">Download</a>
                      <button type="button" className="page-btn" onClick={onRemoveResume} aria-label="Remove resume">Remove</button>
                    </div>
                  </div>
                  <div className="separator" />
                  {resume.type?.startsWith('image/') ? (
                    <img src={resume.dataUrl} alt="Resume preview" style={{ maxWidth: '100%', borderRadius: 8 }} />
                  ) : resume.type === 'application/pdf' ? (
                    <object data={resume.dataUrl} type="application/pdf" width="100%" height="400" aria-label="PDF preview">
                      <p>Your browser cannot display PDF preview. Use the download link above.</p>
                    </object>
                  ) : (
                    <div className="meta">No preview available.</div>
                  )}
                </div>
              ) : (
                <div className="meta">You can also paste a cover letter below if you don't have a resume at hand.</div>
              )}
            </div>

            <div>
              <label htmlFor="ap-cover" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                Cover letter
              </label>
              <textarea
                id="ap-cover"
                className="input"
                rows={6}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Write a brief cover letter explaining why you're a great fit…"
                style={{ height: 'auto', padding: 10, resize: 'vertical' }}
              />
              <div className="meta" style={{ marginTop: 4 }}>
                Tip: At least a resume or a cover letter is required.
              </div>
            </div>
          </div>

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
            <Link className="page-btn" to={`/jobs/${encodeURIComponent(id)}`}>Cancel</Link>
            <button className="button" type="submit" disabled={submitting} aria-label="Submit application">
              {existing ? 'Update application' : 'Submit application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
