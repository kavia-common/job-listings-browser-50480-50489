import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import JobList from './pages/JobList';
import JobDetails from './pages/JobDetails';

// PUBLIC_INTERFACE
function App() {
  /** App root: header + routes */
  return (
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
          <div style={{ marginLeft: 'auto' }}>
            <Link className="link" to="/" aria-label="Go to job list">Jobs</Link>
          </div>
        </div>
      </header>

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<JobList />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
