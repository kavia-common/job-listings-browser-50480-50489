import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { listAssessments } from '../utils/assessments';
import '../App.css';
import { useTranslation } from 'react-i18next';

function Badge({ children, color = 'primary' }) {
  const colors = {
    primary: '#2563EB',
    amber: '#F59E0B',
    gray: '#6B7280',
    red: '#EF4444',
    green: '#10B981',
  };
  return (
    <span style={{ background: `${colors[color]}20`, color: colors[color], padding: '4px 8px', borderRadius: 999, fontSize: 12, marginRight: 6 }}>
      {children}
    </span>
  );
}

export default function AssessmentsHub() {
  const { t } = useTranslation();
  const items = useMemo(() => listAssessments(), []);
  const grouped = useMemo(() => {
    const g = {};
    for (const a of items) {
      if (!g[a.category]) g[a.category] = [];
      g[a.category].push(a);
    }
    return g;
  }, [items]);

  return (
    <div className="container" style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{t('assessments.title')}</h2>
        <p style={{ color: '#6B7280' }}>Take quick MCQ or coding tests to build your skill score. Results are saved locally.</p>
      </div>
      {items.length === 0 && (
        <div className="card" style={{ padding: 24 }}>
          <p>{t('assessments.noAssessments')}</p>
        </div>
      )}
      <div style={{ display: 'grid', gap: 16 }}>
        {Object.entries(grouped).map(([cat, arr]) => (
          <div key={cat} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>{cat}</h3>
              <Badge color="gray">{arr.length} tests</Badge>
            </div>
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              {arr.map((a) => (
                <div key={a.id} className="card" style={{ padding: 12, border: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong>{a.title}</strong>
                        <Badge color={a.type === 'MCQ' ? 'primary' : 'amber'}>{a.type}</Badge>
                        <Badge color="gray">{a.difficulty}</Badge>
                      </div>
                      <div style={{ color: '#6B7280', fontSize: 12 }}>{(a.questions?.length ?? a.question?.tests?.length) || 0} items</div>
                    </div>
                    <Link
                      to={`/assessments/${a.id}`}
                      className="btn"
                      style={{ background: '#2563EB', color: 'white', padding: '8px 12px', borderRadius: 8, textDecoration: 'none' }}
                    >
                      {t('assessments.start')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <Link to="/assessments/results" style={{ color: '#2563EB' }}>{t('assessments.viewResults')}</Link>
      </div>
    </div>
  );
}
