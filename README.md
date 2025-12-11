# Job Listings Browser

A simple React web app to browse job listings, search, filter, and view job details.

## Quick Start

1. Change directory:
   - cd job_board_frontend
2. Install dependencies:
   - npm install
3. Start the app:
   - npm start
4. Open http://localhost:3000

## API configuration

- By default, the app uses bundled mock data.
- To connect a backend, set REACT_APP_API_BASE in your environment or a .env file in job_board_frontend:
  - REACT_APP_API_BASE=https://your-backend.example.com
- The app will request: ${REACT_APP_API_BASE}/jobs returning an array of job items with fields:
  - id, title, company, location, type, tags, postedAt, description

If the endpoint is not reachable or returns an error, the app logs a console message and falls back to mock data automatically.

Other optional env vars:
- REACT_APP_NODE_ENV, REACT_APP_LOG_LEVEL (error|warn|info|debug|trace|silent)

## Features

- Ocean Professional theme (primary #2563EB, secondary #F59E0B, error #EF4444, background #f9fafb, surface #ffffff, text #111827)
- Client-side search and basic filters (type, location)
- Pagination
- Routing for list and details (/ and /jobs/:id)
- Accessible focus styles, ARIA labels, responsive layout

## Tests

- Minimal unit test included. Run: npm test