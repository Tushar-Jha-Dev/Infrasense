import { Link } from "react-router-dom";

function NotFound() {
  return (
    <main
      className="container"
      style={{
        paddingTop: "var(--space-7)",
        paddingBottom: "var(--space-7)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          maxWidth: "460px",
          margin: "0 auto",
          padding: "var(--space-6)",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow)",
        }}
      >
        <h1 style={{ fontSize: "24px", marginBottom: "var(--space-2)" }}>
          Page not found
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "var(--space-5)" }}>
          The page you are looking for does not exist or may have been moved.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to home
        </Link>
      </div>
    </main>
  );
}

export default NotFound;
