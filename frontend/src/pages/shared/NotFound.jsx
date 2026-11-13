import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth.js";
import { roleHome } from "../../utils/roleHome.js";

function NotFound() {
  const { user } = useAuth();

  const destination = user ? roleHome(user.role) : "/login";
  let buttonLabel = "Return to Dashboard";

  if (!user) {
    buttonLabel = "Go to Login";
  } else if (user.role === "technician") {
    buttonLabel = "Return to My Tasks";
  } else if (user.role === "admin") {
    buttonLabel = "Return to Dashboard";
  }

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
          maxWidth: "480px",
          margin: "0 auto",
          padding: "var(--space-6)",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontSize: "48px",
            fontFamily: "Fraunces, Georgia, serif",
            fontWeight: 700,
            color: "var(--primary)",
            lineHeight: 1,
            marginBottom: "var(--space-2)",
          }}
        >
          404
        </span>

        <h1
          style={{
            fontSize: "22px",
            marginBottom: "var(--space-2)",
            color: "var(--text)",
          }}
        >
          Page not found
        </h1>

        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "15px",
            marginBottom: "var(--space-5)",
            lineHeight: 1.5,
          }}
        >
          The page you are looking for does not exist, has been moved, or is temporarily unavailable.
        </p>

        <Link to={destination} className="btn btn-primary">
          {buttonLabel}
        </Link>
      </div>
    </main>
  );
}

export default NotFound;
