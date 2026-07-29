"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingDown } from "lucide-react";
import "../login/login.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-bg-glow" />
      <div className="login-card">
        <div className="login-logo-container">
          <Link href="/" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="login-icon-box">
              <TrendingDown size={22} />
            </div>
            <h1 className="login-logo-text">Deep<span className="login-logo-highlight">Puts</span></h1>
          </Link>
          <p className="login-subtitle">Reset your password</p>
        </div>

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
              <p style={{ color: "#4ade80", margin: 0, fontSize: "0.875rem" }}>Check your email for a reset link. It expires in 1 hour.</p>
            </div>
            <Link href="/login" style={{ color: "#f43f5e", fontSize: "0.875rem", textDecoration: "none" }}>← Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="login-form-box">
              <div className="login-form-group">
                <label className="login-label">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="login-input"
                />
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" disabled={loading} className="login-submit">
              {loading ? "Sending…" : "Send Reset Link"}
            </button>

            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <Link href="/login" style={{ color: "var(--text-3)", fontSize: "0.8rem", textDecoration: "none" }}>← Back to sign in</Link>
            </div>
          </form>
        )}

        <div className="login-footer">
          <p className="login-footer-disclaimer">Not financial advice. For informational purposes only.</p>
        </div>
      </div>
    </div>
  );
}
