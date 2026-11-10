import { Routes, Route, Link } from "react-router-dom";
import Landing from "./pages/public/Landing.jsx";
import NotFound from "./pages/shared/NotFound.jsx";

// TEMPORARY placeholder for /login and /register — to be replaced in the next step
function AuthPlaceholder({ title }) {
  return (
    <main
      className="container"
      style={{ paddingTop: "var(--space-7)", paddingBottom: "var(--space-7)" }}
    >
      <div
        style={{
          maxWidth: "440px",
          margin: "0 auto",
          padding: "var(--space-6)",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow)",
        }}
      >
        <h1 style={{ fontSize: "24px", marginBottom: "var(--space-2)" }}>{title}</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>
          Coming in the next step
        </p>
        <Link to="/" className="btn btn-secondary">
          Back to home
        </Link>
      </div>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      {/* TEMPORARY auth placeholders — replace with Login and Register pages */}
      <Route path="/login" element={<AuthPlaceholder title="Login" />} />
      <Route path="/register" element={<AuthPlaceholder title="Register" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
