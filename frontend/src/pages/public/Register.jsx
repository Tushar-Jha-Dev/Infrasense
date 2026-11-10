import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Alert from "../../components/ui/Alert.jsx";
import Input from "../../components/ui/Input.jsx";
import { getHomeRoute, useAuth } from "../../context/useAuth.js";
import "./Auth.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegisterForm({ name, email, password, confirmPassword }) {
  const errors = {};

  if (!name.trim()) {
    errors.name = "Full name is required";
  }

  if (!email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
}

function Register() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
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

  const updateField = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const errors = validateRegisterForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      };
      if (form.phone.trim()) {
        payload.phone = form.phone.trim();
      }

      const registeredUser = await register(payload);
      navigate(getHomeRoute(registeredUser.role), { replace: true });
    } catch (err) {
      setServerError(err.message || "Unable to create account");
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

        <section className="auth-card" aria-labelledby="register-heading">
          <h1 id="register-heading" className="auth-title">
            Create account
          </h1>
          <p className="auth-subtitle">
            Register as a campus user to report and track maintenance issues.
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <Alert variant="error">{serverError}</Alert>

            <Input
              label="Full name"
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Aarav Sharma"
              value={form.name}
              onChange={updateField("name")}
              error={fieldErrors.name}
              disabled={submitting}
              required
            />

            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@institution.edu"
              value={form.email}
              onChange={updateField("email")}
              error={fieldErrors.email}
              disabled={submitting}
              required
            />

            <Input
              label="Phone (optional)"
              type="tel"
              name="phone"
              autoComplete="tel"
              placeholder="9876543210"
              value={form.phone}
              onChange={updateField("phone")}
              disabled={submitting}
            />

            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={updateField("password")}
              error={fieldErrors.password}
              disabled={submitting}
              required
            />

            <Input
              label="Confirm password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={updateField("confirmPassword")}
              error={fieldErrors.confirmPassword}
              disabled={submitting}
              required
            />

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={submitting}
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default Register;
