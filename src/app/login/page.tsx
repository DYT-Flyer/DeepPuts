"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TrendingDown, X, CheckCircle, Zap } from "lucide-react";

import Link from "next/link";
import "./login.css";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "plan">("form");
  const [planLoading, setPlanLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "signup") {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else if (mode === "signup") {
      setLoading(false);
      setStep("plan");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function handleSelectPro() {
    setPlanLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        router.push("/");
      }
    } catch {
      router.push("/");
    }
  }

  if (!mounted) return null;

  if (step === "plan") {
    return (
      <div className="login-container">
        <div className="login-bg-glow" />
        <div className="login-card" style={{ maxWidth: "28rem" }}>
          <div className="login-logo-container" style={{ marginBottom: "1.5rem" }}>
            <div className="login-icon-box">
              <TrendingDown size={22} />
            </div>
            <h1 className="login-logo-text" style={{ fontSize: "1.75rem" }}>
              Deep<span className="login-logo-highlight">Puts</span>
            </h1>
            <p className="login-subtitle">Account created — choose your plan</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* FREE */}
            <div
              style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "14px", padding: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div>
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", margin: 0 }}>Free</p>
                  <p style={{ color: "var(--text-3)", fontSize: "0.75rem", margin: "2px 0 0" }}>$0 / month</p>
                </div>
              </div>
              <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                {["Preview 3 cards per page", "Basic event feed access", "Voting & community discussion"].map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "var(--text-2)" }}>
                    <CheckCircle size={13} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { router.push("/"); router.refresh(); }}
                style={{
                  width: "100%", padding: "10px", borderRadius: "10px",
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  color: "var(--text-2)", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}
              >
                Continue Free
              </button>
            </div>

            {/* PRO */}
            <div
              style={{
                background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.4)",
                borderRadius: "14px", padding: "20px", position: "relative", overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: 0, right: 0, background: "#f43f5e", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "3px 10px", borderBottomLeftRadius: "10px" }}>
                RECOMMENDED
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div>
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    Pro <Zap size={13} style={{ color: "#f43f5e" }} />
                  </p>
                  <p style={{ color: "#f43f5e", fontSize: "0.75rem", margin: "2px 0 0", fontWeight: 600 }}>$19.99 / month</p>
                </div>
              </div>
              <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                {["Unlimited AI bear thesis analysis", "Real-time price tracking & horizons", "Instant high-conviction alerts", "Full event history & search"].map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "#fff" }}>
                    <CheckCircle size={13} style={{ color: "#f43f5e", flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleSelectPro}
                disabled={planLoading}
                style={{
                  width: "100%", padding: "10px", borderRadius: "10px",
                  background: planLoading ? "rgba(244,63,94,0.5)" : "linear-gradient(135deg, #f43f5e, #e11d48)",
                  border: "none", color: "#fff", fontSize: "0.8rem", fontWeight: 700,
                  cursor: planLoading ? "not-allowed" : "pointer",
                  boxShadow: planLoading ? "none" : "0 4px 14px rgba(244,63,94,0.35)",
                }}
                onMouseEnter={e => { if (!planLoading) e.currentTarget.style.filter = "brightness(1.1)"; }}
                onMouseLeave={e => { if (!planLoading) e.currentTarget.style.filter = "brightness(1)"; }}
              >
                {planLoading ? "Redirecting to checkout…" : "Upgrade to PRO →"}
              </button>
            </div>
          </div>

          <div className="login-footer">
            <div className="login-footer-links">
              <Link href="/tos" className="login-footer-link">Terms of Service</Link>
              <span>·</span>
              <Link href="/privacy" className="login-footer-link">Privacy Policy</Link>
            </div>
            <p className="login-footer-disclaimer">Not financial advice. For informational purposes only.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-bg-glow" />

      <div className="login-card">
        <button onClick={() => router.back()} className="login-close-button" aria-label="Go back" type="button">
          <X size={18} />
        </button>

        {/* Logo as a Link to allow returning to Dashboard */}
        <div className="login-logo-container">
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="login-icon-box">
              <TrendingDown size={22} />
            </div>
            <h1 className="login-logo-text">
              Deep<span className="login-logo-highlight">Puts</span>
            </h1>
          </Link>
          <p className="login-subtitle">
            {mode === "signup" ? "Create an account to get started" : "Sign in to vote, comment, and save theses"}
          </p>
        </div>

        {/* Toggle */}
        <div className="login-tabs">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(""); }}
              className={`login-tab ${mode === m ? "login-tab-active" : "login-tab-inactive"}`}
            >
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="login-form-box">
            {mode === "signup" && (
              <div className="login-form-group">
                <label className="login-label">Username</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Choose a username"
                  required={mode === "signup"}
                  className="login-input"
                />
              </div>
            )}

            <div className="login-form-group">
              <label className="login-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="login-input"
              />
            </div>

            <div className="login-form-group">
              <label className="login-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="login-input"
              />
              {mode === "signup" && (
                <p className="login-hint">Minimum 8 characters</p>
              )}
            </div>
          </div>

          {mode === "signup" && (
            <p className="login-tos">
              By creating an account you agree to our{" "}
              <Link href="/tos">Terms of Service</Link>{" "}
              and acknowledge that DeepPuts provides AI-generated analysis for informational purposes only — not investment advice.
            </p>
          )}

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="login-submit"
          >
            {loading ? (mode === "signup" ? "Creating account…" : "Signing in…") : (mode === "signup" ? "Create Account" : "Sign In")}
          </button>
        </form>

        {/* Footer links */}
        <div className="login-footer">
          <div className="login-footer-links">
            <Link href="/tos" className="login-footer-link">Terms of Service</Link>
            <span>·</span>
            <Link href="/privacy" className="login-footer-link">Privacy Policy</Link>
          </div>
          <p className="login-footer-disclaimer">
            Not financial advice. For informational purposes only.
          </p>
        </div>
      </div>
    </div>
  );
}
