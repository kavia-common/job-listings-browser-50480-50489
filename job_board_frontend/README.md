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

## Internationalization (i18n)

- Library: react-i18next with i18next.
- Initialization: see src/i18n/index.js (detects from localStorage or browser, persists changes).
- Supported: English (en), Telugu (te), Hindi (hi)
- Language selector in header: src/components/LanguageSelector.js

Translations live in:
- src/i18n/locales/en.json
- src/i18n/locales/te.json
- src/i18n/locales/hi.json

RTL scaffold: document dir/lang is updated on language change. Current languages are LTR.

Add a new language:
1. Create src/i18n/locales/<code>.json mirroring en.json keys.
2. Add import and resource entry in src/i18n/index.js and include <code> in SUPPORTED_LANGS.
3. Add labels under lang.<code> and lang.short.<code> keys for the selector.

Usage:
- In component: const { t } = useTranslation(); then t('nav.jobs'), t('filters.results', { count })
- Use Intl helpers from src/i18n/index.js for numbers and dates (formatNumber, formatDateTime).

## Tests

- Minimal tests are language-agnostic by checking roles instead of exact text where possible.
