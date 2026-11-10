import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Alert from "../../components/ui/Alert.jsx";
import Input from "../../components/ui/Input.jsx";
import { getHomeRoute, useAuth } from "../../context/useAuth.js";
import "./Auth.css";

function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <main className="auth-page">
        <div className="auth-wrapper">
          <div className="auth-card">
            <p>Checking session...</p>
          </div>
        </div>
      </main>
    );
  }

  if (user) {
    return <Navigate to={getHomeRoute(user.role)} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const errors = {};
    if (!email.trim()) {
      errors.email = "Email is required";
    }
    if (!password) {
      errors.password = "Password is required";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const loggedInUser = await login(email.trim(), password);
      navigate(getHomeRoute(loggedInUser.role), { replace: true });
    } catch (err) {
      setServerError(err.message || "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-brand-row">
          <Link to="/" className="auth-brand">
            InfraSense
          </Link>
          <Link to="/" className="auth-home-link">
            Back to home
          </Link>
        </div>

        <section className="auth-card" aria-labelledby="login-heading">
          <h1 id="login-heading" className="auth-title">
            Sign in
          </h1>
          <p className="auth-subtitle">
            Enter your account credentials to continue.
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <Alert variant="error">{serverError}</Alert>

            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@institution.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: "" }));
                }
              }}
              error={fieldErrors.email}
              disabled={submitting}
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: "" }));
                }
              }}
              error={fieldErrors.password}
              disabled={submitting}
              required
            />

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="auth-footer">
            New to InfraSense? <Link to="/register">Create an account</Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default Login;
