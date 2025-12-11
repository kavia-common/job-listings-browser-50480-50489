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
- Routing: / for list, /jobs/:id for details, /alerts for Job Alerts

### Job Alerts

Client-side rules stored in localStorage. Channels:
- In-app toast: immediate, stored in history.
- Push (browser Notifications API): optional, ask permission in /alerts.
- Email: simulated only; entries are recorded in the Alerts history but no real emails are sent.

Future email/push integration:
- Email: connect to a backend service (e.g., via REACT_APP_API_BASE) exposing an endpoint to send emails (SendGrid, Mailgun, SES). The frontend should POST alert events to backend; backend handles actual delivery.
- Push: use a service worker and Web Push (VAPID) with a backend to store subscriptions and send push messages. This demo uses Notification API locally without service workers.

## Tests

- Minimal unit test included: npm test
