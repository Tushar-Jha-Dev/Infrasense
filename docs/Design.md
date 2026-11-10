# InfraSense – Design System

Goal: a calm, professional, readable operations tool. It must NOT look like a generic AI
dashboard template. Plain CSS with variables, defined once in `frontend/src/styles/tokens.css`
and imported first. Light theme first; dark mode only if everything else is done (then add a
`[data-theme="dark"]` block that overrides the same variables).

## 1. Tokens (light theme)
```css
:root {
  --bg: #F6F3EE;            /* warm off-white page background */
  --surface: #FFFFFF;       /* cards, tables, forms */
  --surface-2: #EFEAE2;     /* subtle panels, table headers */
  --border: #DDD6CA;
  --text: #1F2A2B;
  --text-muted: #5E6B6C;

  --primary: #0F5E5C;       /* deep teal */
  --primary-hover: #0B4B49;
  --primary-soft: #DCEBEA;  /* selected nav item, soft highlights */
  --on-primary: #FFFFFF;

  /* Severity (only for severity badges) */
  --sev-low: #2F7D5B;
  --sev-medium: #B7791F;
  --sev-high: #C2570C;
  --sev-critical: #B42318;

  /* Status (only for status badges) */
  --st-submitted: #4A6572;
  --st-review: #8A6A1F;
  --st-assigned: #2B6A8F;
  --st-progress: #0F5E5C;
  --st-resolved: #2F7D5B;
  --st-closed: #6B6B6B;

  --danger: #B42318;
  --focus: #0F5E5C;

  --radius: 8px;
  --radius-sm: 6px;
  --shadow: 0 1px 2px rgba(31, 42, 43, 0.08);
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px;
}
```
Badges use the colour for text and border with a very light tint of the same colour as
background. Never rely on colour alone: always show the text label too.

## 2. Typography
- Headings (page titles, section titles): **Fraunces**, weights 600–700.
- Body and UI: **IBM Plex Sans**, weights 400, 500, 600.
- IDs and numbers in tables (AST-0001, CMP-0001, costs): **IBM Plex Mono**.
- Load from Google Fonts in `index.html`; always give fallbacks
  (`Georgia, serif` / `system-ui, sans-serif` / `ui-monospace, monospace`).
- Scale: 13px small, 15px body, 18px section title, 24px page title, 32px landing hero.
  Line height 1.5 for body.

## 3. Layout
- Logged-in app: fixed left sidebar (role-specific links) + top bar (page title, user menu)
  + content area with max width about 1200px and padding var(--space-5).
- On screens under 768px the sidebar becomes a top menu button that opens a drawer.
- Cards: white surface, 1px border, small radius, tiny shadow. Avoid heavy shadows,
  gradients, glassmorphism, neon colours and decorative blobs.
- Lists of records are tables on desktop and stacked cards on mobile.
- Dashboard = a row of 3–4 stat cards, then the most relevant table. Charts use Recharts in
  the token colours.

## 4. Components to build once and reuse
Button (primary, secondary, danger, small), Input, Select, Textarea (with label and error text),
Card, StatCard, Badge (SeverityBadge, StatusBadge), Table, EmptyState, Spinner, Alert,
Modal or ConfirmDialog, PageHeader, Sidebar, Topbar, Timeline (for status history).

## 5. Behaviour and accessibility
- Visible focus ring using `--focus`. Labels on every input. Minimum 4.5:1 text contrast.
- Buttons show a disabled/loading state while a request runs.
- Every data screen has loading, empty and error states. Errors are plain sentences.
- Icons from `lucide-react` only; no emoji as icons.
- Landing page: short headline, one-paragraph explanation, Login and Register buttons,
  and three small cards explaining Report, Assign, Resolve. No stock imagery.
- Brand: text wordmark "InfraSense" in Fraunces; a simple favicon can be added later.
- Complaint details show an "AI suggestion" label next to AI-generated category, severity and
  causes, and a "Confirmed by admin" label once an admin has set them.
