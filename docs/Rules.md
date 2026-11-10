# InfraSense – Rules for the AI assistant

Read ALL files in `docs/` before every task. If a request conflicts with them, stop and ask.

## 1. How to work
1. Do ONLY the task in the prompt. One small feature at a time (a phase in `Phases.md` is built
   through several separate prompts). Never build ahead into the next feature or phase. No extra features.
2. Inspect existing files before changing anything. Reuse existing code; never duplicate logic.
3. Do not rewrite working files. Make the smallest change that does the job.
4. Do not add dependencies without asking. Allowed so far: express, cors, dotenv, mongoose,
   bcryptjs (backend); react, react-router-dom, lucide-react, recharts (frontend, when needed).
5. Before coding, list the files you will create or change. After coding, list what changed.
6. Finish every task with: how to run it, how to test it (exact commands or clicks), and
   expected results. Do not claim it works until the developer confirms the test passed.
7. Explain non-obvious decisions in short plain language. The developer is learning.
8. Never touch `.env`. Never print or commit secrets. Add new variable NAMES to `.env.example`
   with placeholder values only.
9. Update the status in `docs/Phases.md` only when the developer confirms a phase is tested.

## 2. Backend rules
- ES modules; relative imports end in `.js`.
- Structure: routes → controllers → models; shared logic in `services/` and `middleware/`.
- Validate every input on the backend (required fields, types, allowed enum values, lengths).
  Treat request body fields as strings; reject objects where a string is expected.
- Never trust the client for role, status, ids of other users, or ownership. Set them on the server.
- Every protected route uses `protect`; role-limited routes also use `authorize(...)`.
  Also check ownership (a user sees only their own complaints, etc.).
- Never return password hashes. Never expose stack traces to clients.
- Consistent errors: `{ "message": "..." }` with correct status codes (400, 401, 403, 404, 409, 500).
- Wrap async handlers in try/catch (or a shared wrapper). Log server errors with `console.error`.
- The AI step must never make complaint submission fail (see Architecture.md section 7).
- Use Mongoose references and `populate` instead of copying data. Add indexes for fields that
  are filtered often (status, submittedBy, assignedTo, asset).

## 3. Frontend rules
- React + Vite, JavaScript (no TypeScript). Function components and hooks.
- Plain CSS with design tokens from `Design.md`. No Bootstrap, no Tailwind, no UI kits.
- API calls only through `src/api/` helper functions (one place for base URL and token header).
- No business logic in JSX where it can be a helper. Keep components small and reusable.
- Show loading, empty and error states on every data screen. Validate forms and show clear messages.
- Never use `localStorage` for anything except the auth token.
- Hiding a button is a convenience only; the backend is the real security.
- Keep ESLint clean (the project has `eslint.config.js`).

## 4. Security checklist (apply to every feature)
Passwords hashed; JWT secret from env; role and ownership checks on the server; input validated;
no secrets in Git; CORS limited to known origins before deployment; no sensitive data in logs.

## 5. Git
Branch `main`. Conventional Commits: `feat(scope): ...`, `fix: ...`, `docs: ...`, `chore: ...`.
The developer commits and pushes; propose a commit message at the end of each task.
Never rewrite history.

## 6. Testing
Each task ends with a manual test the developer can run (curl/Thunder Client for APIs, clicks
for UI). Note any case you did not test. Do not skip error cases (wrong password, wrong role,
missing fields, someone else's complaint).
