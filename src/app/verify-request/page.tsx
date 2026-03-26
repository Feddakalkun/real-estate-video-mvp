export default function VerifyRequestPage() {
  return (
    <main className="site-shell login-shell">
      <section className="site-wrap panel verify-card">
        <p className="badge">Check your inbox</p>
        <h1 style={{ fontSize: "2rem", marginTop: "0.7rem", fontWeight: 800 }}>Magic link sent</h1>
        <p className="small-muted" style={{ marginTop: "0.6rem" }}>
          We sent a sign-in email. Open the link to finish authentication and continue to your
          dashboard.
        </p>
      </section>
    </main>
  );
}
