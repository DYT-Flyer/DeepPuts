"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../login/login.css";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#f87171", marginBottom: "8px", fontSize: "0.875rem" }}>No token found in URL.</p>
        <p style={{ color: "var(--text-3)", marginBottom: "16px", fontSize: "0.75rem" }}>The link may have been modified or expired.</p>
        <Link href="/forgot-password" style={{ color: "#f43f5e", fontSize: "0.875rem", textDecoration: "none" }}>Request a new one →</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <p style={{ color: "#4ade80", margin: 0, fontSize: "0.875rem" }}>Password updated! Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to reset password"); return; }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="login-form-box">
        <div className="login-form-group">
          <label className="login-label">New password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="login-input" />
          <p className="login-hint">Minimum 8 characters</p>
        </div>
        <div className="login-form-group">
          <label className="login-label">Confirm new password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••" className="login-input" />
        </div>
      </div>
      {error && <div className="login-error">{error}</div>}
      <button type="submit" disabled={loading} className="login-submit">
        {loading ? "Saving…" : "Set New Password"}
      </button>
    </form>
  );
}
