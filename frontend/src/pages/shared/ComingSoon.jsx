// TEMPORARY placeholder page — each later feature will replace its own route
function ComingSoon({ title }) {
  return (
    <section
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        padding: "var(--space-6)",
      }}
    >
      <h1 style={{ fontSize: "24px", marginBottom: "var(--space-2)" }}>{title}</h1>
      <p style={{ color: "var(--text-muted)" }}>
        This page is built in a later step.
      </p>
    </section>
  );
}

export default ComingSoon;
