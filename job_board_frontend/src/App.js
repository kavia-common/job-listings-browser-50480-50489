import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom';
import './App.css';
import JobList from './pages/JobList';
import JobDetails from './pages/JobDetails';
import ApplyPage from './pages/ApplyPage';
import Profile from './pages/Profile';
import CompanyReviewsPage from './pages/CompanyReviews';
import SavedJobsPage from './pages/SavedJobs';
import PostJob from './pages/PostJob';
import EditJob from './pages/EditJob';
import ApplicationsPage from './pages/ApplicationsPage';
import AssessmentsHub from './pages/AssessmentsHub';
import AssessmentRunnerMCQ from './pages/AssessmentRunnerMCQ';
import AssessmentRunnerCoding from './pages/AssessmentRunnerCoding';
import AssessmentResults from './pages/AssessmentResults';
import { getAssessment } from './utils/assessments';
import AlertsPage from './pages/Alerts';
import { AlertsProvider } from './utils/AlertsProvider';
import Team from './pages/Team';
import { getActiveMember, listMembers, setActiveMember } from './utils/team';
import Interviews from './pages/Interviews';
import JobInterviews from './pages/JobInterviews';
import LanguageSelector from './components/LanguageSelector';
import { useTranslation } from 'react-i18next';

function MemberSwitcher() {
  const members = listMembers();
  const active = getActiveMember();
  if (!members || members.length === 0) return null;

  const onChange = (e) => {
    const id = e.target.value;
    if (!id) return;
    try {
      setActiveMember(id);
      // simple reload to reflect across app without global state
      window.location.reload();
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="member-switcher" title="Active team member" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="meta">Active:</span>
      <select aria-label="Active Member" onChange={onChange} value={active?.id || ''} className="select" style={{ height: 32 }}>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} {m.role === 'Admin' ? '(Admin)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

// Decides which runner to render based on assessment type
function AssessmentRouter() {
  const { id } = useParams();
  const assessment = useMemo(() => getAssessment(id), [id]);
  if (!assessment) return <AssessmentRunnerMCQ />;
  if (assessment.type === 'Coding') return <AssessmentRunnerCoding />;
  return <AssessmentRunnerMCQ />;
}

// PUBLIC_INTERFACE
function App() {
  /** App root: header + routes wrapped by BrowserRouter to ensure Links and routes work */
  const { t } = useTranslation();

  return (
    <BrowserRouter>
      <AlertsProvider>
        <div className="app-shell">
          <header className="header" role="banner">
            <div className="header-wrap">
              <div className="brand">
                <div className="brand-badge" aria-hidden>JB</div>
                <div>
                  <div className="brand-title">{t('app.title')}</div>
                  <div className="brand-sub">Ocean Professional</div>
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center' }}>
                <Link className="link" to="/" aria-label={t('nav.jobs')}>{t('nav.jobs')}</Link>
                <Link className="link" to="/saved" aria-label={t('nav.saved')} title={t('nav.saved')}>{t('nav.saved')}</Link>
                <Link className="link" to="/applications" aria-label={t('nav.applications')} title={t('nav.applications')}>{t('nav.applications')}</Link>
                <Link className="link" to="/assessments" aria-label={t('nav.assessments')} title={t('nav.assessments')}>{t('nav.assessments')}</Link>
                <Link className="link" to="/alerts" aria-label={t('nav.alerts')} title={t('nav.alerts')}>{t('nav.alerts')}</Link>
                <Link className="link" to="/companies/acme/reviews" aria-label={t('nav.reviews')} title={t('nav.reviews')}>{t('nav.reviews')}</Link>
                <Link className="link" to="/team" aria-label={t('nav.team')} title={t('nav.team')} style={{ color: '#F59E0B', fontWeight: 700 }}>{t('nav.team')}</Link>
                <Link className="link" to="/interviews" aria-label={t('interviews.title')}>{t('interviews.title')}</Link>
                <Link className="link" to="/profile" aria-label={t('nav.profile')}>{t('nav.profile')}</Link>
                <Link className="link" to="/post" aria-label={t('nav.postJob')} title={t('nav.postJob')}>{t('nav.postJob')}</Link>
                <LanguageSelector />
                <MemberSwitcher />
              </div>
            </div>
          </header>

          <Routes>
            <Route path="/" element={<JobList />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/jobs/:id/interviews" element={<JobInterviews />} />
            <Route path="/jobs/:id/apply" element={<ApplyPage />} />
            <Route path="/jobs/:id/edit" element={<EditJob />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/saved" element={<SavedJobsPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/post" element={<PostJob />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/team" element={<Team />} />
            {/* Assessments */}
            <Route path="/assessments" element={<AssessmentsHub />} />
            <Route path="/assessments/results" element={<AssessmentResults />} />
            <Route path="/assessments/:id" element={<AssessmentRouter />} />
            <Route path="/companies/:companyKey/reviews" element={<CompanyReviewsPage />} />
            {/* Candidate interviews list */}
            <Route path="/interviews" element={<Interviews />} />
          </Routes>
        </div>
      </AlertsProvider>
    </BrowserRouter>
  );
}

export default App;
