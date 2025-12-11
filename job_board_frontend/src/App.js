import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import JobList from './pages/JobList';
import JobDetails from './pages/JobDetails';
import ApplyPage from './pages/ApplyPage';
import Profile from './pages/Profile';

// PUBLIC_INTERFACE
function App() {
  /** App root: header + routes wrapped by BrowserRouter to ensure Links and routes work */
  return (
    <BrowserRouter>
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
              <Link className="link" to="/profile" aria-label="Go to profile">Profile</Link>
            </div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<JobList />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
          <Route path="/jobs/:id/apply" element={<ApplyPage />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
