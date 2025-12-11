# Job Listings Frontend

A React app to browse, search, filter, and view job details using the Ocean Professional theme.

## Run locally

- npm install
- npm start
- Open http://localhost:3000

## Configure backend

Create a .env file in this folder (optional):

```
REACT_APP_API_BASE=https://your-backend.example.com
# Optional:
REACT_APP_LOG_LEVEL=info
REACT_APP_NODE_ENV=development
```

If REACT_APP_API_BASE is not set or the endpoint is unreachable, the app falls back to local mock data and logs an info message to console.

Expected endpoint: GET ${REACT_APP_API_BASE}/jobs -> JSON array of jobs:
- id, title, company, location, type, tags, postedAt, description

## Features

- Ocean Professional colors: primary #2563EB, secondary #F59E0B, error #EF4444, background #f9fafb, surface #ffffff, text #111827
- Search and filters (type, location) client-side
- Pagination
- Accessible, responsive UI
- Routing: / for list, /jobs/:id for details

## Tests

- Minimal unit test included: npm test
