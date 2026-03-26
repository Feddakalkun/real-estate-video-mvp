"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("feddakalkun2026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn("email", {
        email,
        redirect: true,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setError(result.error);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: true,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setError(result.error);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="site-shell login-shell">
      <section className="site-wrap panel login-card">
        <p className="badge">Secure Access</p>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 800, marginTop: "0.7rem" }}>
          Sign in to your studio
        </h1>
        <p className="small-muted">Use admin preview login or request a magic link by email.</p>
        <form onSubmit={onAdminLogin} style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
          <label htmlFor="username">Admin username</label>
          <input
            id="username"
            className="field"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
          <label htmlFor="password">Admin password</label>
          <input
            id="password"
            className="field"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button className="button-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in as admin"}
          </button>
        </form>

        <div style={{ marginTop: "0.8rem" }}>
          <Link href="/dashboard" className="button-secondary">
            Open dashboard preview (no login)
          </Link>
        </div>

        <div className="section-split" />

        <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem" }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            className="field"
            placeholder="broker@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="button-primary" type="submit" disabled={loading}>
            {loading ? "Sending link..." : "Send magic link"}
          </button>
        </form>
        {error ? <p className="alert-error">{error}</p> : null}
      </section>
    </main>
  );
}
