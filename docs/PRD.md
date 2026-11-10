# InfraSense – Product Requirements (PRD)

AI-assisted infrastructure maintenance management web app for an educational institution.
B.Tech CSE minor project (ADGIPS, GGSIPU). Solo developer. **Deadline: 13 Nov 2026.**
Stack: MERN (MongoDB Atlas, Express, React + Vite in JavaScript, Node) + an AI/NLP analysis module.

## 1. Goal
Replace manual, scattered complaint handling with one platform: users report infrastructure
problems, AI suggests category, severity and possible causes, an admin reviews and assigns a
technician, the technician fixes and records the work, and every repair is kept as asset history.

## 2. Roles
| Role (stored value) | Who | Can do |
|---|---|---|
| `user` | Student / staff | Register, log in, view assets, submit complaints, track own complaints |
| `admin` | Administrator | Manage users and assets, review complaints and AI output, confirm severity, assign technicians, close complaints, view history and analytics |
| `technician` | Maintenance staff | See assigned complaints, start work, record diagnosis, actions, parts, cost, resolution |

Rules: public registration creates only `user` accounts. Admin and technician accounts are created
by an admin (and one admin is created by a seed script). The backend enforces every permission;
hiding buttons in the UI is never enough.

## 3. Scope (must-have)
1. Authentication: register, login, JWT, `GET /me`, role-based access, protected routes.
2. Asset management: add, list, view, edit, update status/condition, per-asset maintenance history.
3. Complaint submission and tracking (title, description, asset or location, status timeline).
4. AI-assisted analysis on submission: category, severity, possible causes (suggestions only).
5. Admin: dashboard, complaint list with filters, complaint review (see AI output, confirm or
   change category/severity), assign technician, manage technicians/users, close complaints.
6. Technician: dashboard of assigned tasks, task details, start work, record diagnosis, actions,
   parts, cost and resolution.
7. Maintenance records linked to asset, complaint and technician.
8. Basic analytics: totals, pending vs resolved, by category, by severity, cost, frequently
   reported assets.
9. Seed script with realistic sample data, testing, deployment.

## 4. Out of scope (do NOT build)
Sensors/IoT, predictive maintenance, asset health scores, anomaly detection, computer vision,
automatic technician allocation, image upload (only if everything else is finished), payments,
email/SMS notifications, real-time sockets. These are future work for the major project.

## 5. Complaint lifecycle
`Submitted → Under Review → Assigned → In Progress → Resolved → Closed`
- Only forward moves are allowed; a complaint cannot become Resolved just because it was assigned.
- `Under Review`: admin opened/reviewed it. `Assigned`: admin chose a technician.
- `In Progress`: the assigned technician started work. `Resolved`: technician submitted a
  maintenance record. `Closed`: admin confirms.
- Every change is stored in `statusHistory` with who, when and an optional note.

## 6. AI requirements
- Input: complaint title + description (+ asset category if known).
- Output: `category`, `severity`, `possibleCauses[]`, and `source` (`llm` or `rules`).
- Categories: Electrical, Plumbing, Furniture, HVAC, Civil/Structural, Networking, Sanitation, Other.
- Severity: Low, Medium, High, Critical.
  - Critical: risk to safety or health (exposed wires, sparking, flooding, gas smell, structural crack, fire risk)
  - High: a whole room/area unusable or a key service is down
  - Medium: partial loss of function or a clear nuisance
  - Low: cosmetic or minor inconvenience
- Possible causes are suggestions, never confirmed diagnoses. The UI labels them "AI suggestion".
- The admin can confirm or override category and severity; the confirmed values are stored
  separately from the AI values.
- If the AI call fails or returns invalid data, fall back to keyword rules. Complaint submission
  must never fail because of the AI step.

## 7. Pages (consolidated; this replaces the earlier 21-screen list)
Public: Landing, Login, Register.
User: Dashboard (with My Complaints), New Complaint, Complaint Details (timeline).
Admin: Dashboard, Complaints (list + filters), Complaint Review (details, AI output, assign),
Assets (list, add/edit, details with history), Users and Technicians, Analytics.
Technician: My Tasks, Task Details (diagnosis + resolution form).
Shared: Profile.

## 8. Non-functional
Responsive (desktop and mobile), clear error messages, backend validation on every input,
passwords hashed with bcrypt, secrets only in `.env`, modular code, sample data labelled as sample.

## 9. Honesty rule for the report
Only features that are implemented AND tested may be described as completed. Track status in
`Phases.md`.
