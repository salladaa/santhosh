"use client";
import { useState } from "react";
import { Brand } from "./shell";
import { Icon } from "./icon";
import { request } from "@/lib/client";
import { T, LanguageToggle } from "./language";
export function LoginForm({ demo }: { demo: boolean }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await request<{ redirect: string }>(
        "/api/auth/login",
        "POST",
        { email, password },
      );
      window.location.assign(result.redirect);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.");
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <Brand />
        <div className="story-content">
          <div className="eyebrow">CONNECTED CARE STARTS HERE</div>
          <h1>
            More clarity.
            <br />
            More time
            <br />
            <em>for care.</em>
          </h1>
          <p>
            Patient records, appointments, and everyday operations. Together in
            one thoughtful workspace.
          </p>
          <div className="story-line">
            <Icon name="activity" size={36} />
            <span>One place for your care team.</span>
          </div>
        </div>
        <span className="story-footer">CARE, WITH PEOPLE AT THE CENTRE.</span>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <LanguageToggle />
          <span className="small-icon">
            <Icon name="heart" size={26} />
          </span>
          <h2>
            <T>Welcome back</T>
          </h2>
          <p>Sign in to your hospital workspace.</p>
          <form onSubmit={submit}>
            <label>
              <T>Email address</T>
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hospital.com"
              />
            </label>
            <label>
              <T>Password</T>
              <input
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </label>
            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}
            <button className="button primary full" disabled={busy}>
              <T>{busy ? "Signing in…" : "Sign in"}</T>
              <Icon name="arrow" size={18} />
            </button>
          </form>
          {demo && (
            <div className="demo-box">
              <strong>Explore the demo</strong>
              <p>Choose a sample account, then sign in.</p>
              <div className="demo-buttons">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@hospital.com");
                    setPassword("admin123");
                  }}
                >
                  Administrator <Icon name="arrow" size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("john@hospital.com");
                    setPassword("john123");
                  }}
                >
                  Patient <Icon name="arrow" size={15} />
                </button>
              </div>
              <small>
                Sample data only. Do not enter real patient information.
              </small>
            </div>
          )}
          <p className="login-help">
            Need access? Contact your hospital administrator.
          </p>
        </div>
        <span className="login-copyright">
          © {new Date().getFullYear()} Sri Allada Hospitals
        </span>
      </section>
    </main>
  );
}
