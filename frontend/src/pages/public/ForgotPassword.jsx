import { useState } from "react";
import { Link } from "react-router-dom";
import Alert from "../../components/ui/Alert.jsx";
import Input from "../../components/ui/Input.jsx";
import { forgotPassword } from "../../api/auth.js";
import Landing from "./Landing.jsx";
import "./Auth.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setSuccessMessage("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("Email is required");
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setEmailError("Enter a valid email address");
      return;
    }

    setEmailError("");
    setSubmitting(true);

    try {
      const res = await forgotPassword(trimmedEmail);
      setSuccessMessage(
        res?.message ||
          "If an account exists, an administrator will contact you with a temporary password."
      );
    } catch (err) {
      setServerError(err.message || "Unable to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-modal-content">
      {successMessage ? (
        <div className="auth-form">
          <Alert variant="success">{successMessage}</Alert>
          <p className="auth-notice-text">
            Please check with your primary campus administrator for your new temporary password.
          </p>
          <Link to="/login" className="btn btn-secondary auth-submit">
            Back to sign in
          </Link>
        </div>
      ) : (
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
              if (emailError) {
                setEmailError("");
              }
            }}
            error={emailError}
            disabled={submitting}
            required
          />

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={submitting}
          >
            {submitting ? "Sending..." : "Send reset request"}
          </button>
        </form>
      )}

      <p className="auth-footer">
        Remember your password? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}

function ForgotPassword() {
  return <Landing authModal="forgot-password" />;
}

export default ForgotPassword;
