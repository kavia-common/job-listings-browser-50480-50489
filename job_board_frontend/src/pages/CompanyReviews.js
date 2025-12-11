import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { loadProfile } from '../utils/storage';
import {
  listCompanyReviews,
  addReview,
  deleteReview,
  updateReview,
  computeAverages,
  normalizeCompanyKey,
  getLocalOwnerId,
} from '../utils/reviews';
import { useTranslation } from 'react-i18next';

// PUBLIC_INTERFACE
export default function CompanyReviewsPage() {
  /** Company Reviews page */
  const { t } = useTranslation();
  const { companyKey } = useParams();
  const navigate = useNavigate();
  const key = normalizeCompanyKey(companyKey);
  const [profile, setProfile] = useState(loadProfile());
  const [sort, setSort] = useState('newest');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(blankForm());
  const [error, setError] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState(listCompanyReviews(key));
  const ownerId = getLocalOwnerId();

  useEffect(() => {
    setReviews(listCompanyReviews(key));
    const onChange = (e) => {
      if (e.detail?.companyKey === key) {
        setReviews(listCompanyReviews(key));
      }
    };
    window.addEventListener('reviews:change', onChange);
    return () => window.removeEventListener('reviews:change', onChange);
  }, [key]);

  function onSubmit(e) {
    e.preventDefault();
    const validation = validateForm(form);
    if (validation) {
      setError(validation);
      return;
    }
    setError('');
    const author = {
      name: profile?.personal?.fullName || '',
      email: profile?.personal?.email || '',
    };
    try {
      if (editingId) {
        updateReview(editingId, {
          title: form.title.trim(),
          body: form.body.trim(),
          ratings: { ...form.ratings },
          author,
        });
      } else {
        addReview(key, {
          title: form.title.trim(),
          body: form.body.trim(),
          ratings: { ...form.ratings },
          author,
        });
      }
      setForm(blankForm());
      setEditingId('');
    } catch (err) {
      setError(err?.message || 'Failed to save review.');
    }
  }

  function onEdit(r) {
    setEditingId(r.id);
    setForm({
      title: r.title,
      body: r.body,
      ratings: { ...r.ratings },
    });
  }
  function onCancelEdit() {
    setEditingId('');
    setForm(blankForm());
    setError('');
  }
  function onDelete(id) {
    const ok = window.confirm(t('actions.delete'));
    if (!ok) return;
    deleteReview(id);
  }

  const sorted = useMemo(() => {
    const arr = [...reviews];
    if (sort === 'highest') {
      return arr.sort((a, b) => avgOf(a) === avgOf(b) ? (b.createdAt - a.createdAt) : (avgOf(b) - avgOf(a)));
    }
    return arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [reviews, sort]);

  const stats = computeAverages(reviews);

  return (
    <div className="main">
      <div className="detail" role="region" aria-label={t('reviews.title')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem' }}>{t('reviews.title')}</h1>
            <div className="meta" style={{ marginTop: 4 }}>
              {key || 'company'} • {stats.count} review{stats.count === 1 ? '' : 's'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="page-btn" onClick={() => navigate(-1)} aria-label="Back">← {t('actions.close')}</button>
            <Link className="button" to="/">{t('nav.jobs')}</Link>
          </div>
        </div>

        <div className="separator" />

        <AveragesBar stats={stats} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <div className="meta">Sort</div>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 220 }}>
            <option value="newest">Newest</option>
            <option value="highest">Highest overall</option>
          </select>
        </div>

        <div className="separator" />

        <section aria-label="Add or edit review" className="card" style={{ padding: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{editingId ? 'Edit your review' : 'Add a review'}</h2>
          <form onSubmit={onSubmit} style={{ marginTop: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              <div>
                <label htmlFor="rev-title" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Title</label>
                <input id="rev-title" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Great culture and learning" required />
              </div>
              <div>
                <label htmlFor="rev-body" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Your experience</label>
                <textarea
                  id="rev-body"
                  className="input"
                  rows={5}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Share details on culture, compensation fairness, and work-life balance…"
                  style={{ height: 'auto', padding: 10, resize: 'vertical' }}
                  required
                />
              </div>
            </div>

            <div className="separator" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <RatingField label="Culture" value={form.ratings.culture} onChange={(v) => setForm({ ...form, ratings: { ...form.ratings, culture: v } })} />
              <RatingField label="Salary" value={form.ratings.salary} onChange={(v) => setForm({ ...form, ratings: { ...form.ratings, salary: v } })} />
              <RatingField label="Work-life" value={form.ratings.workLife} onChange={(v) => setForm({ ...form, ratings: { ...form.ratings, workLife: v } })} />
            </div>

            {error ? <div className="meta" role="alert" style={{ color: 'var(--color-error)', marginTop: 8 }}>{error}</div> : null}

            <div style={{ display: 'flex', justifyContent: 'end', gap: 8, marginTop: 10 }}>
              {editingId ? <button type="button" className="page-btn" onClick={onCancelEdit}>Cancel</button> : null}
              <button className="button" type="submit">{editingId ? 'Save changes' : 'Submit review'}</button>
            </div>
          </form>
        </section>

        <div className="separator" />

        <section aria-label="Reviews list" style={{ display: 'grid', gap: 10 }}>
          {sorted.length === 0 ? (
            <div className="meta">{t('reviews.empty')}</div>
          ) : (
            sorted.map((r) => (
              <ReviewItem
                key={r.id}
                review={r}
                canEdit={String(r.ownerId) === String(ownerId)}
                onEdit={() => onEdit(r)}
                onDelete={() => onDelete(r.id)}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function AveragesBar({ stats }) {
  const dims = [
    { key: 'culture', label: 'Culture', value: stats.culture },
    { key: 'salary', label: 'Salary', value: stats.salary },
    { key: 'workLife', label: 'Work-life', value: stats.workLife },
  ];
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className="badge" title="Overall rating" style={{ background: 'rgba(37,99,235,.08)', borderColor: 'rgba(37,99,235,.25)', color: '#1d4ed8', fontWeight: 700 }}>
          Overall {stats.overall || 0}/5
        </span>
        <span className="badge" title="Total reviews">{stats.count} review{stats.count === 1 ? '' : 's'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginTop: 10 }}>
        {dims.map((d) => (
          <div key={d.key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 60px', alignItems: 'center', gap: 8 }}>
            <div className="meta" style={{ fontWeight: 600 }}>{d.label}</div>
            <div style={{ height: 8, background: '#f3f4f6', borderRadius: 999, overflow: 'hidden' }} aria-hidden>
              <div
                style={{
                  height: 8,
                  width: `${(Math.max(0, Math.min(5, d.value)) / 5) * 100}%`,
                  background: 'linear-gradient(90deg, rgba(37,99,235,.6), rgba(37,99,235,1))',
                }}
              />
            </div>
            <div className="meta" style={{ textAlign: 'right' }}>{d.value || 0}/5</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewItem({ review, canEdit, onEdit, onDelete }) {
  const stamp = review.createdAt ? new Date(review.createdAt).toLocaleString() : '';
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{review.title}</div>
          <div className="meta" style={{ marginTop: 2 }}>
            {review.author?.name ? review.author.name : 'Anonymous'} • {stamp}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {canEdit ? (
            <>
              <button className="page-btn" onClick={onEdit} aria-label="Edit">Edit</button>
              <button className="page-btn" onClick={onDelete} aria-label="Delete" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}>
                Delete
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div className="separator" />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Stars label="Culture" value={review.ratings.culture} />
        <Stars label="Salary" value={review.ratings.salary} />
        <Stars label="Work-life" value={review.ratings.workLife} />
        <span className="badge" title="Overall">
          Overall {avgOf(review)}/5
        </span>
      </div>
      <div className="separator" />
      <div style={{ whiteSpace: 'pre-wrap' }}>{review.body}</div>
    </div>
  );
}

function Stars({ label, value }) {
  const count = Math.max(0, Math.min(5, parseInt(value || 0, 10)));
  return (
    <span className="meta" title={`${label}: ${value}/5`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span aria-label={`${label} rating ${value} out of 5`} style={{ color: '#F59E0B', fontWeight: 700 }}>
        {'★'.repeat(count)}
        <span style={{ color: '#D1D5DB' }}>{'★'.repeat(5 - count)}</span>
      </span>
      <span className="badge" style={{ marginLeft: 4 }}>{value}/5</span>
    </span>
  );
}

function RatingField({ label, value, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <strong>{label}</strong>
        <span className="meta">(1–5)</span>
      </div>
      <div role="group" aria-label={`${label} rating`} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="page-btn"
            title={`${label}: ${n}`}
            aria-label={`${label} ${n}`}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            style={{
              minWidth: 36,
              height: 36,
              borderColor: value >= n ? 'rgba(245,158,11,.35)' : undefined,
              background: value >= n ? 'rgba(245,158,11,.12)' : undefined,
              color: value >= n ? '#b45309' : undefined,
              fontWeight: value >= n ? 700 : 500,
            }}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

function blankForm() {
  return {
    title: '',
    body: '',
    ratings: { culture: 3, salary: 3, workLife: 3 },
  };
}

function validateForm(f) {
  if (!String(f.title || '').trim()) return 'Title is required.';
  if (!String(f.body || '').trim()) return 'Please share some details in your review.';
  const r = f.ratings || {};
  for (const k of ['culture', 'salary', 'workLife']) {
    const v = parseInt(r[k] || 0, 10);
    if (!Number.isFinite(v) || v < 1 || v > 5) return 'Ratings must be between 1 and 5.';
  }
  return '';
}

function avgOf(r) {
  const rr = r?.ratings || {};
  const c = clamp1to5(rr.culture);
  const s = clamp1to5(rr.salary);
  const w = clamp1to5(rr.workLife);
  if (!c || !s || !w) return 0;
  return Math.round(((c + s + w) / 3) * 10) / 10;
}
function clamp1to5(n) {
  const v = parseInt(n || 0, 10);
  if (!Number.isFinite(v)) return 0;
  return Math.max(1, Math.min(5, v));
}
