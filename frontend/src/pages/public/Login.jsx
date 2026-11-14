import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../../components/ui/Alert.jsx";
import Input from "../../components/ui/Input.jsx";
import { useAuth } from "../../context/useAuth.js";
import { roleHome } from "../../utils/roleHome.js";
import Landing from "./Landing.jsx";
import "./Auth.css";

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      navigate(roleHome(loggedInUser.role), { replace: true });
    } catch (err) {
      setServerError(err.message || "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-modal-content">
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
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}

function Login() {
  return <Landing authModal="login" />;
}

export default Login;
