"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import { useAuth } from "../../lib/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);

    if (username.trim().length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(username.trim())) {
      setError("Username must be 3–20 characters using letters, numbers, dots, dashes or underscores.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await register(username.trim(), password);
      router.push("/");
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page-scroll">
      <NavBar />
      <main className="container container-narrow">
        <div className="page-head auth-head">
          <h1>Register</h1>
          <p>Create an account to keep your progress in the cloud.</p>
        </div>

        <div className="auth-card">
          <form className="auth-form" onSubmit={onSubmit}>
            <div className="field">
              <label className="field-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              <span className="field-hint">At least 6 characters. Stored encrypted with bcrypt.</span>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                className="input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>

            {error && (
              <div className="error-box" role="alert">
                <div className="error-title">ERROR</div>
                <div className="error-message">{error}</div>
              </div>
            )}

            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link href="/login">Log in →</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}