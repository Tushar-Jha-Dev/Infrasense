import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ClipboardList, UserCheck, Wrench } from "lucide-react";
import Modal from "../../components/ui/Modal.jsx";
import { useAuth } from "../../context/useAuth.js";
import { roleHome } from "../../utils/roleHome.js";
import { LoginForm } from "./Login.jsx";
import { RegisterForm } from "./Register.jsx";
import "./Landing.css";

const WORKFLOW_STEPS = [
  {
    title: "Report",
    description:
      "Students and staff submit campus maintenance issues with location details and get instant AI-assisted triage.",
    Icon: ClipboardList,
  },
  {
    title: "Assign",
    description:
      "Administrators review suggested categories and severity levels, then assign each issue to the right technician.",
    Icon: UserCheck,
  },
  {
    title: "Resolve",
    description:
      "Technicians track assigned tasks and record diagnoses, parts used, and costs as permanent asset history.",
    Icon: Wrench,
  },
];

function Landing({ authModal }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const currentModal =
    authModal ||
    (location.pathname === "/login"
      ? "login"
      : location.pathname === "/register"
      ? "register"
      : null);

  if (!loading && user && currentModal) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  const handleCloseModal = () => {
    navigate("/");
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="container landing-header-inner">
          <Link to="/" className="landing-brand">
            InfraSense
          </Link>
          <nav className="landing-nav" aria-label="Account navigation">
            <Link to="/login" className="landing-nav-link">
              Login
            </Link>
            <Link to="/register" className="btn btn-secondary btn-sm">
              Register
            </Link>
          </nav>
        </div>
      </header>

      <main className="container landing-main">
        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <h1 id="landing-hero-title" className="landing-hero-title">
            Clear campus maintenance tracking from report to repair
          </h1>
          <p className="landing-hero-subtitle">
            InfraSense brings infrastructure complaints, AI-assisted issue triage,
            technician assignments, and asset repair records into one organised
            workspace for your institution.
          </p>
          <div className="landing-hero-actions">
            <Link to="/login" className="btn btn-primary">
              Login
            </Link>
            <Link to="/register" className="btn btn-secondary">
              Register
            </Link>
          </div>
        </section>

        <section className="landing-steps" aria-label="How InfraSense works">
          <div className="landing-steps-grid">
            {WORKFLOW_STEPS.map(({ title, description, Icon }) => (
              <article key={title} className="landing-step-card">
                <div className="landing-step-icon">
                  <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <h2 className="landing-step-title">{title}</h2>
                <p className="landing-step-desc">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      {currentModal === "login" && (
        <Modal
          open
          onClose={handleCloseModal}
          title="Sign in"
          subtitle="Enter your account credentials to continue."
        >
          <LoginForm />
        </Modal>
      )}

      {currentModal === "register" && (
        <Modal
          open
          onClose={handleCloseModal}
          title="Create account"
          subtitle="Register as a campus user to report and track maintenance issues."
        >
          <RegisterForm />
        </Modal>
      )}
    </div>
  );
}

export default Landing;
