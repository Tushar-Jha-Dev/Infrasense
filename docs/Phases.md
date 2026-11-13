# InfraSense – Phases and Status

Deadline: **13 Nov 2026** (working project + progress report).
Status values: DONE (built and tested) · PARTIAL · TODO.
Only the developer marks a phase DONE, after testing it. Do not mark anything DONE yourself.

| # | Phase | Status | Target |
|---|---|---|---|
| 1 | Foundation: Git, Express backend, Vite React frontend, proxy, MongoDB Atlas connection | DONE | 10 Nov |
| 2 | Authentication and roles | DONE | 10 Nov |
| 3 | Asset management | DONE | 10 Nov |
| 4 | Complaint submission and tracking | TODO | 10–11 Nov |
| 5 | AI analysis (category, severity, causes, rules fallback) | TODO | 11 Nov |
| 6 | Admin: review, assign, users and technicians | TODO | 11 Nov |
| 7 | Technician: tasks, diagnosis, resolution, maintenance record | TODO | 11 Nov |
| 8 | Asset history and basic analytics | TODO | 12 Nov |
| 9 | Seed data, end-to-end testing, bug fixing | TODO | 12 Nov |
| 10 | Deployment | TODO | 12 Nov |
| – | Report, screenshots, final checks | TODO | 12–13 Nov |

## Phase details and exit criteria

### Phase 2 – Authentication and roles
Build: `POST /auth/login` (JWT), `GET /auth/me`, `protect` and `authorize` middleware,
central error handler, seed of one admin (can be part of the later seed script, or a small
script now). Frontend: Login and Register pages, AuthContext (token + user), protected routes,
role-based redirect and sidebar layout shell.
Done when: register, login and logout work; a wrong password is rejected; a `user` token gets
403 on an admin route; refreshing the page keeps the user logged in.

### Phase 3 – Assets
Build: Asset model, CRUD API (write routes admin only), asset list/add/edit/details pages.
Done when: admin can add, edit and change status of an asset; users can only view assets.

### Phase 4 – Complaints
Build: Complaint model, submit, my complaints, complaint details with timeline, `complaintId`
generation, `statusHistory`. (AI fields stay empty until Phase 5.)
Done when: a user submits a complaint and sees it in My Complaints with status Submitted;
another user cannot open it.

### Phase 5 – AI analysis
Build: `services/aiAnalysis.js` per Architecture.md, called when a complaint is created;
store the result in `aiAnalysis`; show it in the UI with the "AI suggestion" label.
Done when: clear complaints get sensible category/severity/causes; with the LLM key removed or
invalid the rules fallback still works; submission never fails because of the AI.

### Phase 6 – Admin
Build: admin dashboard, complaints list with filters, review (confirm or change category and
severity), assign technician, users and technicians page (create technician, deactivate).
Done when: admin reviews a complaint, assigns a technician, and the status and timeline update.

### Phase 7 – Technician
Build: assigned tasks list, task details, start work, resolve form that creates a
MaintenanceRecord, status Resolved; admin closes.
Done when: technician sees only their tasks; resolving without diagnosis is rejected; the
record appears in the asset's history.

### Phase 8 – History and analytics
Build: asset maintenance history, `GET /analytics/summary`, dashboard charts and cost totals.
Done when: numbers match the data in the database.

### Phase 9 – Seed data and testing
Build: `seed/seed.js` (about 15 assets, 1 admin, 3 technicians, a few users, 15–20 complaints
in different stages, a few maintenance records) clearly marked as sample data; run the full
workflow end to end; check roles, validation, errors and mobile layout.

### Phase 10 – Deployment
Deploy backend and frontend, set production environment variables, allow the host in Atlas,
set CORS origins, test login and the full workflow on the live site.

## Progress log
(Append one short line per tested phase: date, phase, what was verified, known issues.)
- 10 Nov 2026 – Phase 1 verified: backend health route, frontend proxy, Atlas connection.
- 10 Nov 2026 – Phase 2 (partial): User model and register API; hashed password verified in Atlas.
- 10 Nov 2026 – Phase 2 done: register, login (JWT), protect/authorize, /auth/me, admin seed, login/register pages, protected routes and layout.
- 10 Nov 2026 – Phase 3 done: Asset model and API (admin writes, all roles read), asset list/details/form pages.
- 12 Nov 2026 – Phase 4 done: complaint model/API, user complaint pages, status history.
- 12 Nov 2026 – Phase 5 (rules only): rule-based AI analysis, 24/26 on own test set; LLM layer pending.
- 13 Nov 2026 – Phase 6 (admin) done: users API, admin complaint API and pages.
- 13 Nov 2026 – Phase 7 (API only) done: technician workflow API and maintenance records, curl-tested; technician pages pending.
