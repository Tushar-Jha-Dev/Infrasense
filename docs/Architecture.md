# InfraSense – Architecture

## 1. Overview
React SPA (Vite) → REST API (Express) → MongoDB Atlas (Mongoose).
The AI analysis lives inside the backend as one replaceable service module.

```
Browser (React) --/api--> Express API --> Mongoose --> MongoDB Atlas
                              |
                              +--> services/aiAnalysis.js --> LLM API (fallback: keyword rules)
```

## 2. Folder structure
`exists` = already built by hand. Everything else is planned.

```
Infrasense/
├── backend/
│   ├── config/db.js                 exists
│   ├── controllers/                 authController.js (register) exists
│   ├── middleware/                  auth.js (protect, authorize), errorHandler.js
│   ├── models/                      User.js exists; Asset, Complaint, MaintenanceRecord
│   ├── routes/                      authRoutes.js exists
│   ├── services/                    aiAnalysis.js
│   ├── seed/seed.js
│   ├── server.js                    exists
│   ├── .env (never committed)       PORT, MONGO_URI, JWT_SECRET, JWT_EXPIRES_IN, LLM_API_KEY
│   └── .env.example                 exists (placeholders only)
├── frontend/                        Vite + React (JavaScript), ESLint configured
│   └── src/ api/  components/  context/  pages/  styles/  App.jsx  main.jsx
└── docs/                            PRD, Architecture, Rules, Design, Phases
```

## 3. Existing facts (do not change without asking)
- Backend is ES modules (`"type": "module"`). Imports of local files MUST include `.js`.
- Scripts: `npm run dev` (node --watch server.js), `npm start`.
- Frontend dev server proxies `/api` to `http://localhost:5000` (vite.config.js).
- `User` model: name, email (unique, lowercase), password (bcrypt hash, `select: false`),
  role (`user | admin | technician`, default `user`), phone, isActive, timestamps.
  Has `matchPassword()` and a pre-save hash hook.
- `POST /api/auth/register` exists and never accepts `role` from the request body.
- Git: branch `main`, author email is the GitHub noreply address, Conventional Commits.

## 4. Data models (Mongoose)
**Asset**: assetId (unique, e.g. `AST-0001`), name, category (same list as complaint categories),
description, building, location, installationDate, condition (`Good | Fair | Poor`),
status (`Operational | Under Maintenance | Out of Service`), timestamps.

**Complaint**: complaintId (unique, e.g. `CMP-0001`), title, description, asset (ref, optional),
location (string), submittedBy (ref User), status (lifecycle in PRD),
aiAnalysis `{ category, severity, possibleCauses[], source: llm|rules, analyzedAt }`,
confirmedCategory, confirmedSeverity (set by admin, optional), reviewedBy,
assignedTo (ref User), assignedBy, assignedAt, assignmentNotes,
statusHistory `[{ status, changedBy, changedAt, note }]`, timestamps.

**MaintenanceRecord**: complaint (ref), asset (ref, optional), technician (ref), diagnosis,
actionTaken, partsUsed, cost (Number, >= 0), resolutionDetails, notes, completedAt, timestamps.

Design decision (state this in the report): assignment data is stored inside Complaint instead of
a separate Assignment collection, to keep the minor project simple. It can be split later.

## 5. Auth and access control
- Login returns a JWT (payload: user id, role). Sent as `Authorization: Bearer <token>`.
- `protect` middleware verifies the token and loads the user (reject inactive users).
- `authorize(...roles)` middleware checks the role. Every protected route uses both.
- Owners only: a `user` can read only their own complaints; a `technician` only complaints
  assigned to them. Check ownership in the controller, not only the role.
- Token storage on the frontend: `localStorage` (simple; mention the XSS trade-off in the report).

## 6. API (all under `/api`; JSON; errors are `{ "message": "..." }`)
| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | /auth/register | public | create `user` account (exists) |
| POST | /auth/login | public | returns token + user |
| GET | /auth/me | any logged in | current user |
| GET | /users?role= | admin | list users |
| POST | /users | admin | create technician/admin |
| PATCH | /users/:id | admin | edit, activate/deactivate |
| GET | /assets, /assets/:id | any logged in | list/view |
| POST, PUT, PATCH | /assets, /assets/:id | admin | create/edit/update status |
| GET | /assets/:id/history | admin | maintenance records for the asset |
| POST | /complaints | user | submit (runs AI analysis) |
| GET | /complaints/mine | user | own complaints |
| GET | /complaints | admin | all, with filters (status, severity, category) |
| GET | /complaints/assigned | technician | assigned to me |
| GET | /complaints/:id | owner / admin / assigned technician | details + timeline |
| PATCH | /complaints/:id/review | admin | confirm category/severity, status Under Review |
| PATCH | /complaints/:id/assign | admin | assign technician, status Assigned |
| PATCH | /complaints/:id/start | assigned technician | status In Progress |
| POST | /complaints/:id/resolve | assigned technician | creates MaintenanceRecord, status Resolved |
| GET | /complaints/:id/maintenance | owner / admin / assigned technician | maintenance record of the complaint; the owner sees only resolutionDetails, completedAt and technician name; returns null until resolved |
| PATCH | /complaints/:id/close | admin | status Closed |
| GET | /analytics/summary | admin | totals and group counts |

## 7. AI service contract (`backend/services/aiAnalysis.js`)
`analyzeComplaint({ title, description, assetCategory })` returns
`{ category, severity, possibleCauses, source }` and **never throws**.
1. Try the LLM (provider chosen later; key from `LLM_API_KEY`; one function so it is swappable).
   Ask for JSON only; parse it; validate category/severity against the allowed lists;
   keep at most 4 short causes.
2. On any error, timeout (about 8 s) or invalid output, use keyword rules
   (e.g. "spark", "short circuit" → Electrical + Critical; "leak", "pipe" → Plumbing).
3. Without `LLM_API_KEY`, use the rules directly (`source: "rules"`).

## 8. Deployment (decide in the last phase)
Frontend and backend deployed separately, Atlas as the database. Needs: production env vars,
Atlas network access for the host, CORS allowed origins, frontend API base URL from an env var.
