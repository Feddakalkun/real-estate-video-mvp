import Link from "next/link";

export default function HomePage() {
  return (
    <main className="hero-shell">
      <section className="hero-card">
        <p className="badge">Image-to-Video MVP</p>
        <h1>Real estate clips from a single photo.</h1>
        <p>
          Upload a property image, choose camera movement, and receive a rendered video in your
          gallery.
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
    </main>
  );
}
