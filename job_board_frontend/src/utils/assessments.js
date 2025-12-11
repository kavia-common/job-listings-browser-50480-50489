//
// Assessment utilities: definitions, attempts, and computed skill scores
// Storage keys: assessments, assessmentAttempts, skillScores
//
// Ocean Professional theme compatible, localStorage only.
// Includes seeded sample assessments (MCQ and Coding).
//

// PUBLIC_INTERFACE
export function listAssessments() {
  /** List all available assessments. */
  const data = _ensureSeeded();
  return data.assessments;
}

// PUBLIC_INTERFACE
export function getAssessment(id) {
  /** Get assessment by id. Returns null if not found. */
  const data = _ensureSeeded();
  return data.assessments.find((a) => a.id === id) || null;
}

// PUBLIC_INTERFACE
export function submitAssessmentAttempt(id, payload) {
  /**
   * Submit an attempt for assessment id.
   * payload: { answers?, code?, results: { score, total, perQuestion?, pass?, cases? } }
   * Persists attempt with timestamp; recomputes skill scores.
   * Returns saved attempt object.
   */
  const now = new Date().toISOString();
  const attempts = _getAttempts();
  const attempt = {
    id: _uuid(),
    assessmentId: id,
    timestamp: now,
    ...payload,
  };
  attempts.push(attempt);
  localStorage.setItem(LS_KEYS.attempts, JSON.stringify(attempts));
  const scores = computeSkillScoresFromAttempts();
  return { attempt, scores };
}

// PUBLIC_INTERFACE
export function computeSkillScoresFromAttempts() {
  /**
   * Recompute skill scores based on attempts.
   * Strategy: per assessment skill accumulate best score, then per skill compute average of best of related assessments.
   * Returns { scoresBySkill: { [skill]: { score: number, lastUpdated: iso } }, raw: ... }
   */
  const data = _ensureSeeded();
  const attempts = _getAttempts();
  const bestByAssessment = new Map();
  // Track best score per assessment
  for (const att of attempts) {
    const key = att.assessmentId;
    const score = att?.results?.score ?? 0;
    if (!bestByAssessment.has(key) || bestByAssessment.get(key) < score) {
      bestByAssessment.set(key, score);
    }
  }
  // Group by skill
  const bySkill = {};
  for (const a of data.assessments) {
    const best = bestByAssessment.get(a.id);
    if (best == null) continue;
    for (const skill of a.skills || []) {
      if (!bySkill[skill]) bySkill[skill] = [];
      bySkill[skill].push(best);
    }
  }
  const now = new Date().toISOString();
  const scoresBySkill = {};
  for (const [skill, arr] of Object.entries(bySkill)) {
    const avg = arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
    scoresBySkill[skill] = {
      score: Math.round(avg),
      lastUpdated: now,
    };
  }
  const out = { scoresBySkill, lastUpdated: now };
  localStorage.setItem(LS_KEYS.skillScores, JSON.stringify(out));
  return out;
}

// PUBLIC_INTERFACE
export function getSkillScores() {
  /** Get computed skill scores, computing if missing. */
  const raw = localStorage.getItem(LS_KEYS.skillScores);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      /* noop */
    }
  }
  return computeSkillScoresFromAttempts();
}

// PUBLIC_INTERFACE
export function listAttempts() {
  /** Return all attempts newest-first. */
  return _getAttempts().sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

// PUBLIC_INTERFACE
export function gradeMCQ(assessment, answersMap) {
  /**
   * Grade MCQ assessment. answersMap: { [questionId]: string | string[] }
   * Returns: { score, total, perQuestion: [{id, correct: boolean, selected, correctAnswer}] }
   */
  const perQuestion = [];
  let correctCount = 0;
  for (const q of assessment.questions) {
    if (q.type === 'mcq' || q.type === 'multi') {
      const selected = answersMap[q.id];
      const correctAnswer = q.answer;
      let isCorrect = false;
      if (q.type === 'mcq') {
        isCorrect = selected != null && selected === correctAnswer;
      } else if (q.type === 'multi') {
        const sel = Array.isArray(selected) ? [...selected].sort() : [];
        const ans = Array.isArray(correctAnswer) ? [...correctAnswer].sort() : [];
        isCorrect = JSON.stringify(sel) === JSON.stringify(ans);
      }
      if (isCorrect) correctCount += 1;
      perQuestion.push({
        id: q.id,
        correct: isCorrect,
        selected: selected ?? null,
        correctAnswer,
      });
    }
  }
  const total = perQuestion.length || 0;
  const score = total ? Math.round((correctCount / total) * 100) : 0;
  return { score, total, perQuestion };
}

// PUBLIC_INTERFACE
export function runCodingChecker(assessment, codeText) {
  /**
   * Lightweight, safe(ish) checker for coding questions.
   * For safety, we avoid eval and run simple function signature matching through new Function in a limited way.
   * The assessment defines: functionName, tests: [{ args, expect }]
   * Returns: { pass: boolean, cases: [{name, pass, got, expect}], score }
   */
  const question = assessment?.question;
  if (!question || !question.functionName || !Array.isArray(question.tests)) {
    return { pass: false, cases: [], score: 0 };
  }
  const cases = [];
  let passed = 0;
  try {
    // Construct a function returning the user function from code
    // We wrap to avoid global leakage.
    const fnFactory = new Function(`
      "use strict";
      ${codeText}
      if (typeof ${question.functionName} !== 'function') {
        throw new Error('Function ${question.functionName} not defined');
      }
      return ${question.functionName};
    `);
    const userFn = fnFactory();
    for (let i = 0; i < question.tests.length; i++) {
      const t = question.tests[i];
      let ok = false;
      let got;
      try {
        got = userFn.apply(null, t.args);
        ok = _deepEqual(got, t.expect);
      } catch (e) {
        ok = false;
        got = `Error: ${e.message}`;
      }
      if (ok) passed += 1;
      cases.push({
        name: t.name || `Case ${i + 1}`,
        pass: ok,
        got,
        expect: t.expect,
      });
    }
  } catch (e) {
    cases.push({
      name: 'Compilation',
      pass: false,
      got: `Error: ${e.message}`,
      expect: 'No error',
    });
  }
  const total = question.tests.length || 1;
  const score = Math.round((passed / total) * 100);
  return { pass: passed === total, cases, score, total };
}

// Internal helpers

const LS_KEYS = {
  assessments: 'assessments',
  attempts: 'assessmentAttempts',
  skillScores: 'skillScores',
};

function _getAttempts() {
  const raw = localStorage.getItem(LS_KEYS.attempts);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function _ensureSeeded() {
  const raw = localStorage.getItem(LS_KEYS.assessments);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // fall-through to reseed
    }
  }
  const seeded = _seedData();
  localStorage.setItem(LS_KEYS.assessments, JSON.stringify(seeded));
  return seeded;
}

function _seedData() {
  // Seeded sample assessments: 2 MCQ, 1 Coding
  const assessments = [
    {
      id: 'js-basics-mcq',
      title: 'JavaScript Basics',
      category: 'JavaScript',
      type: 'MCQ',
      difficulty: 'Beginner',
      skills: ['JavaScript'],
      questions: [
        {
          id: 'q1',
          type: 'mcq',
          text: 'Which keyword declares a block-scoped variable?',
          options: ['var', 'let', 'function', 'with'],
          answer: 'let',
        },
        {
          id: 'q2',
          type: 'mcq',
          text: 'What is the result of typeof null?',
          options: ['null', 'object', 'undefined', 'number'],
          answer: 'object',
        },
        {
          id: 'q3',
          type: 'multi',
          text: 'Select all truthy values.',
          options: ['0', '""', '[]', '{}'],
          answer: ['[]', '{}'],
        },
        {
          id: 'q4',
          type: 'mcq',
          text: 'Which method converts JSON string to object?',
          options: ['JSON.parse', 'JSON.stringify', 'toString', 'parseInt'],
          answer: 'JSON.parse',
        },
        {
          id: 'q5',
          type: 'mcq',
          text: 'Which symbol is used to denote rest parameters?',
          options: ['??', '...', '=>', '&&'],
          answer: '...',
        },
      ],
    },
    {
      id: 'react-fundamentals-mcq',
      title: 'React Fundamentals',
      category: 'React',
      type: 'MCQ',
      difficulty: 'Beginner',
      skills: ['React', 'JavaScript'],
      questions: [
        {
          id: 'rq1',
          type: 'mcq',
          text: 'Which hook is used for state in a function component?',
          options: ['useState', 'useEffect', 'useMemo', 'useRef'],
          answer: 'useState',
        },
        {
          id: 'rq2',
          type: 'mcq',
          text: 'What must you pass to setState updater when next state is derived from previous?',
          options: ['Object', 'Array', 'Function', 'String'],
          answer: 'Function',
        },
        {
          id: 'rq3',
          type: 'mcq',
          text: 'What prop uniquely identifies list elements to help React reconcile?',
          options: ['id', 'name', 'key', 'data-id'],
          answer: 'key',
        },
        {
          id: 'rq4',
          type: 'mcq',
          text: 'Which hook runs after every render by default?',
          options: ['useContext', 'useReducer', 'useEffect', 'useCallback'],
          answer: 'useEffect',
        },
        {
          id: 'rq5',
          type: 'mcq',
          text: 'JSX must return a single parent element. What can help without adding nodes?',
          options: ['<span/>', '<div/>', '<Fragment/>', '<section/>'],
          answer: '<Fragment/>',
        },
      ],
    },
    {
      id: 'algo-reverse-string',
      title: 'Coding: Reverse String',
      category: 'Data Structures',
      type: 'Coding',
      difficulty: 'Easy',
      skills: ['Algorithms', 'JavaScript'],
      question: {
        prompt:
          'Implement function reverseString(s) that returns the reverse of the input string.',
        functionName: 'reverseString',
        starter:
`// Implement reverseString(s)
function reverseString(s) {
  // TODO: write your code
  return s.split('').reverse().join('');
}
`,
        samples: [
          { input: 'hello', output: 'olleh' },
          { input: 'abc', output: 'cba' },
        ],
        tests: [
          { name: 'simple-1', args: ['hello'], expect: 'olleh' },
          { name: 'simple-2', args: ['abc'], expect: 'cba' },
          { name: 'empty', args: [''], expect: '' },
        ],
      },
    },
  ];
  return { assessments };
}

function _uuid() {
  return 'att-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function _deepEqual(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}
