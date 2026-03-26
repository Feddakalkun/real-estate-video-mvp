import Link from "next/link";

export default function HomePage() {
  return (
    <main className="site-shell hero-shell">
      <div className="site-wrap hero-grid">
        <section className="hero-card panel">
          <p className="badge">Image-to-Video Studio</p>
          <h1>Cinematic property videos from one photo.</h1>
          <p>
            Built for brokers and real-estate teams that need polished motion clips fast. Select a
            camera move, upload a still, and download branded-ready output.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="button-primary">
              Sign in with magic link
            </Link>
            <Link href="/dashboard" className="button-secondary">
              Open dashboard
            </Link>
          </div>
        </section>

        <aside className="hero-side panel">
          <p className="badge">Built For Throughput</p>
          <div className="hero-side-grid">
            <article className="hero-stat">
              <p className="small-muted">Preset-driven workflows</p>
              <strong>Drone, Orbit, Walkthrough</strong>
            </article>
            <article className="hero-stat">
              <p className="small-muted">Commercial team flow</p>
              <strong>Wallet, jobs, download history</strong>
            </article>
            <article className="hero-stat">
              <p className="small-muted">Production connectors</p>
              <strong>Runpod + ComfyUI + Stripe</strong>
            </article>
          </div>
        </aside>
      </div>
    </main>
  );
}
