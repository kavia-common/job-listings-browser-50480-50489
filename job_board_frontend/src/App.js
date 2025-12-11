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
  return (
    <BrowserRouter>
      <AlertsProvider>
        <div className="app-shell">
          <header className="header" role="banner">
            <div className="header-wrap">
              <div className="brand">
                <div className="brand-badge" aria-hidden>JB</div>
                <div>
                  <div className="brand-title">Job Browser</div>
                  <div className="brand-sub">Ocean Professional</div>
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
                <Link className="link" to="/" aria-label="Go to job list">Jobs</Link>
                <Link className="link" to="/saved" aria-label="Go to saved jobs" title="Saved jobs">Saved</Link>
                <Link className="link" to="/applications" aria-label="Go to applications" title="Applications">Applications</Link>
                <Link className="link" to="/assessments" aria-label="Go to assessments" title="Assessments">Assessments</Link>
                <Link className="link" to="/alerts" aria-label="Manage alerts" title="Alerts">Alerts</Link>
                <Link className="link" to="/profile" aria-label="Go to profile">Profile</Link>
                <Link className="link" to="/post" aria-label="Post a job" title="Post a job">Post Job</Link>
              </div>
            </div>
          </header>

          <Routes>
            <Route path="/" element={<JobList />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/jobs/:id/apply" element={<ApplyPage />} />
            <Route path="/jobs/:id/edit" element={<EditJob />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/saved" element={<SavedJobsPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/post" element={<PostJob />} />
            <Route path="/alerts" element={<AlertsPage />} />
            {/* Assessments */}
            <Route path="/assessments" element={<AssessmentsHub />} />
            <Route path="/assessments/results" element={<AssessmentResults />} />
            <Route path="/assessments/:id" element={<AssessmentRouter />} />
            <Route path="/companies/:companyKey/reviews" element={<CompanyReviewsPage />} />
          </Routes>
        </div>
      </AlertsProvider>
    </BrowserRouter>
  );
}

export default App;
