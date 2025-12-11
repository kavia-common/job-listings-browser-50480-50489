import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAssessment, gradeMCQ, submitAssessmentAttempt } from '../utils/assessments';
import '../App.css';

export default function AssessmentRunnerMCQ() {
  const { id } = useParams();
  const navigate = useNavigate();
  const assessment = useMemo(() => getAssessment(id), [id]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(null);
  const [warned, setWarned] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (!submitted && Object.keys(answers).length > 0) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
      return undefined;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [answers, submitted]);

  useEffect(() => {
    if (!assessment) return;
    document.title = `${assessment.title} - Assessments`;
  }, [assessment]);

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

  const mcqQuestions = assessment.questions || [];

  const total = mcqQuestions.length;
  const currentAnswered = Object.keys(answers).length;
  const progressPct = total ? Math.round((currentAnswered / total) * 100) : 0;

  function onChange(q, value) {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  }

  function onSubmit() {
    if (currentAnswered < total) {
      if (!warned) {
        alert(`You have ${total - currentAnswered} unanswered question(s).`);
        setWarned(true);
        return;
      }
    }
    const results = gradeMCQ(assessment, answers);
    const saved = submitAssessmentAttempt(assessment.id, { answers, results });
    setSubmitted({ ...saved, results });
  }

  function retake() {
    setAnswers({});
    setSubmitted(null);
    setWarned(false);
    window.scrollTo(0, 0);
  }

  if (submitted) {
    const res = submitted.results;
    return (
      <div className="container" style={{ padding: 16 }}>
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>{assessment.title} - Results</h2>
          <p style={{ margin: '8px 0' }}>
            Score: <strong>{res.score}%</strong> ({res.total} questions)
          </p>
          <div style={{ marginTop: 12 }}>
            <h3 style={{ marginBottom: 8 }}>Review</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {res.perQuestion.map((pq, idx) => (
                <li key={pq.id} className="card" style={{ padding: 12, marginBottom: 8, border: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>Q{idx + 1}</div>
                    <div style={{ color: pq.correct ? '#10B981' : '#EF4444' }}>
                      {pq.correct ? 'Correct' : 'Incorrect'}
                    </div>
                  </div>
                  <div style={{ color: '#6B7280', fontSize: 12 }}>
                    Your answer: {Array.isArray(pq.selected) ? pq.selected.join(', ') : String(pq.selected ?? '—')}
                    {' '}| Correct: {Array.isArray(pq.correctAnswer) ? pq.correctAnswer.join(', ') : String(pq.correctAnswer)}
                  </div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{assessment.title}</h2>
          <div style={{ fontSize: 12, color: '#6B7280' }}>{currentAnswered}/{total} answered</div>
        </div>
        <div style={{ height: 8, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
          <div style={{ width: `${progressPct}%`, background: '#2563EB', height: '100%' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        {mcqQuestions.map((q, idx) => (
          <div key={q.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>Q{idx + 1}.</div>
              <div>{q.text}</div>
            </div>
            <div style={{ marginTop: 8 }}>
              {q.type === 'mcq' && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {q.options.map((opt) => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === opt}
                        onChange={() => onChange(q, opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'multi' && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {q.options.map((opt) => {
                    const set = new Set(Array.isArray(answers[q.id]) ? answers[q.id] : []);
                    const checked = set.has(opt);
                    return (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const newSet = new Set(Array.isArray(answers[q.id]) ? answers[q.id] : []);
                            if (e.target.checked) newSet.add(opt);
                            else newSet.delete(opt);
                            onChange(q, Array.from(newSet));
                          }}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <button onClick={onSubmit} className="btn" style={{ background: '#2563EB', color: 'white', padding: '10px 16px', borderRadius: 8 }}>
          Submit
        </button>
        <div style={{ marginTop: 8 }}>
          <Link to="/assessments" style={{ color: '#2563EB' }}>Back</Link>
        </div>
      </div>
    </div>
  );
}
