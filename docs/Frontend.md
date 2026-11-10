# InfraSense – Frontend Structure

Read together with `Design.md` (look and feel) and `Rules.md` (coding rules).

## 1. Current state
Vite + React (JavaScript) scaffold. `src/App.jsx` is only a backend health-check page.
The default Vite files (`App.css`, `index.css`, `src/assets/*`) are demo leftovers and should be
replaced by `styles/tokens.css` and `styles/base.css` when the real UI is built.

## 2. Dependencies (ask before installing)
`react-router-dom` (routing), `lucide-react` (icons), `recharts` (charts, analytics phase only).

## 3. Folder structure
```
frontend/src/
├── api/            client.js (fetch wrapper), auth.js, assets.js, complaints.js, users.js, analytics.js
├── context/        AuthContext.jsx
├── components/
│   ├── ui/         Button, Input, Select, Textarea, Card, StatCard, Badge, Table, Alert,
│   │               Spinner, EmptyState, Modal, Timeline
│   ├── layout/     AppLayout, Sidebar, Topbar, PageHeader
│   └── ProtectedRoute.jsx
├── pages/          public/, user/, admin/, technician/, shared/
├── styles/         tokens.css, base.css
├── App.jsx         route table
└── main.jsx
```

## 4. Route map
| Path | Page | Roles |
|---|---|---|
| `/` | Landing | public |
| `/login`, `/register` | Login, Register | public |
| `/dashboard` | User dashboard (My Complaints) | user |
| `/complaints/new` | New Complaint | user |
| `/complaints/:id` | Complaint Details with timeline | user (own), admin, technician (assigned) |
| `/assets` | Assets (read-only list and details) | user |
| `/admin` | Admin dashboard | admin |
| `/admin/complaints` | Complaints list + filters | admin |
| `/admin/complaints/:id` | Complaint Review (AI output, confirm, assign, close) | admin |
| `/admin/assets`, `/admin/assets/new`, `/admin/assets/:id`, `/admin/assets/:id/edit` | Asset management and history | admin |
| `/admin/users` | Users and Technicians | admin |
| `/admin/analytics` | Analytics | admin |
| `/technician` | My Tasks | technician |
| `/technician/tasks/:id` | Task Details + resolution form | technician |
| `/profile` | Profile | any logged in |

Unknown paths show a simple Not Found page.

## 5. Auth flow
- `AuthContext` provides `{ user, token, loading, login, logout }`.
- The token is stored in `localStorage` under the key `infrasense_token` (nothing else is stored there).
- On app load: if a token exists, call `GET /api/auth/me`; success sets `user`, failure clears the
  token. Show a spinner while `loading` is true so pages do not flash.
- After login, redirect by role: `user` → `/dashboard`, `admin` → `/admin`, `technician` → `/technician`.
- `ProtectedRoute allowedRoles={[...]}`: not logged in → `/login`; wrong role → that role's home page.
- Any 401 from the API clears the token and sends the user to `/login`.
- The frontend never decides permissions on its own; the backend enforces them.

## 6. API client
- One `client.js` wrapper around `fetch`: sets `Content-Type: application/json`, adds
  `Authorization: Bearer <token>`, parses JSON, and throws an `Error` carrying the server's
  `message` on non-2xx responses.
- Base URL: `import.meta.env.VITE_API_URL || "/api"` (the dev proxy handles `/api`; production
  sets `VITE_API_URL`). Add `VITE_API_URL` to `frontend/.env.example` with a placeholder.
- Page components call the per-resource files (`complaints.js` etc.), never `fetch` directly.

## 7. Sidebar links per role
- user: Dashboard, New Complaint, Assets, Profile
- admin: Dashboard, Complaints, Assets, Users and Technicians, Analytics, Profile
- technician: My Tasks, Profile

## 8. Page data pattern
Each data page keeps `loading`, `error` and `data` state, shows `Spinner`, `Alert` or
`EmptyState` accordingly, and re-fetches after any action that changes data.
