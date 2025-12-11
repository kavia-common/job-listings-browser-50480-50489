import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAssessment, runCodingChecker, submitAssessmentAttempt } from '../utils/assessments';
import '../App.css';

export default function AssessmentRunnerCoding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const assessment = useMemo(() => getAssessment(id), [id]);
  const [code, setCode] = useState(assessment?.question?.starter || '');
  const [submitted, setSubmitted] = useState(null);

  useEffect(() => {
    if (!assessment) return;
    document.title = `${assessment.title} - Assessments`;
    if (assessment?.question?.starter) {
      setCode(assessment.question.starter);
    }
  }, [assessment]);

  useEffect(() => {
    const handler = (e) => {
      if (!submitted && code && code.trim() !== '') {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
      return undefined;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [code, submitted]);

  if (!assessment) {
    return (
      <div className="container" style={{ padding: 16 }}>
        <div className="card" style={{ padding: 24 }}>
          <p>Assessment not found.</p>
          <Link to="/assessments" style={{ color: '#2563EB' }}>Back</Link>
        </div>
      </div>
    );
  }

  function onSubmit() {
    const results = runCodingChecker(assessment, code);
    const saved = submitAssessmentAttempt(assessment.id, { code, results });
    setSubmitted({ ...saved, results });
  }

  function retake() {
    setSubmitted(null);
    setCode(assessment?.question?.starter || '');
    window.scrollTo(0, 0);
  }

  if (submitted) {
    const res = submitted.results;
    return (
      <div className="container" style={{ padding: 16 }}>
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>{assessment.title} - Results</h2>
          <p style={{ margin: '8px 0' }}>
            Score: <strong>{res.score}%</strong> ({res.total} test cases)
          </p>
          <div style={{ marginTop: 12 }}>
            <h3 style={{ marginBottom: 8 }}>Test Cases</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {res.cases.map((c, idx) => (
                <li key={idx} className="card" style={{ padding: 12, marginBottom: 8, border: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>{c.name}</div>
                    <div style={{ color: c.pass ? '#10B981' : '#EF4444' }}>{c.pass ? 'Pass' : 'Fail'}</div>
                  </div>
                  {!c.pass && (
                    <div style={{ color: '#6B7280', fontSize: 12 }}>
                      Got: {String(c.got)} | Expected: {JSON.stringify(c.expect)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={retake} className="btn" style={{ background: '#2563EB', color: 'white', padding: '8px 12px', borderRadius: 8 }}>Retake</button>
            <Link to="/assessments/results" className="btn" style={{ background: '#F59E0B', color: 'white', padding: '8px 12px', borderRadius: 8, textDecoration: 'none' }}>My Results</Link>
            <button onClick={() => navigate('/assessments')} className="btn" style={{ background: '#111827', color: 'white', padding: '8px 12px', borderRadius: 8 }}>Back to Assessments</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 16 }}>
      <div className="card" style={{ padding: 16 }}>
        <h2 style={{ margin: 0 }}>{assessment.title}</h2>
        <div style={{ marginTop: 8, color: '#6B7280' }}>
          {assessment?.question?.prompt}
        </div>
        {assessment?.question?.samples?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <strong>Sample:</strong>
            <ul style={{ margin: 0 }}>
              {assessment.question.samples.map((s, idx) => (
                <li key={idx} style={{ fontSize: 12, color: '#374151' }}>
                  input: {JSON.stringify(s.input)} → output: {JSON.stringify(s.output)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16, marginTop: 12 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Your Code</label>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck="false"
          rows={12}
          style={{
            width: '100%',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            padding: 12,
            outline: 'none',
          }}
        />
        <div style={{ marginTop: 12 }}>
          <button onClick={onSubmit} className="btn" style={{ background: '#2563EB', color: 'white', padding: '10px 16px', borderRadius: 8 }}>
            Run & Submit
          </button>
        </div>
        <div style={{ marginTop: 8 }}>
          <Link to="/assessments" style={{ color: '#2563EB' }}>Back</Link>
        </div>
      </div>
    </div>
  );
}
