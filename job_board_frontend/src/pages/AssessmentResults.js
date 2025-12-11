import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { listAttempts, getAssessment } from '../utils/assessments';

export default function AssessmentResults() {
  const attempts = useMemo(() => listAttempts(), []);
  return (
    <div className="container" style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>My Results</h2>
        <p style={{ color: '#6B7280' }}>Past attempts are stored locally in your browser.</p>
      </div>
      {attempts.length === 0 ? (
        <div className="card" style={{ padding: 24 }}>
          <p>No attempts yet.</p>
          <Link to="/assessments" style={{ color: '#2563EB' }}>Explore assessments</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {attempts.map((att) => {
            const a = getAssessment(att.assessmentId);
            const title = a?.title || att.assessmentId;
            const type = a?.type || 'MCQ';
            const ts = new Date(att.timestamp).toLocaleString();
            const score = att?.results?.score ?? 0;
            return (
              <div key={att.id} className="card" style={{ padding: 12, border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <strong>{title}</strong>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{type}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{ts}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontWeight: 600 }}>{score}%</div>
                    <Link to={`/assessments/${att.assessmentId}`} style={{ color: '#2563EB' }}>Review/Retake</Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
