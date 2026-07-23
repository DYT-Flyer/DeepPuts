"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TrendingDown, X } from "lucide-react";

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
    } else {
      router.push("/");
      router.refresh();
    }
  }

  if (!mounted) return null;

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
