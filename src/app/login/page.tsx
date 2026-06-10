"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TrendingDown } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translate(-50%,-50%)", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(244,63,94,0.04) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4" style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)" }}>
            <TrendingDown size={22} className="text-rose-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Deep<span style={{ color: "#f43f5e" }}>Puts</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            {mode === "signup" ? "Create an account to get started" : "Sign in to vote, comment, and save theses"}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex rounded-xl p-1 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(""); }}
              className="flex-1 py-1.5 text-sm rounded-lg transition-all"
              style={{
                background: mode === m ? "rgba(255,255,255,0.08)" : "transparent",
                color: mode === m ? "var(--text)" : "var(--text-3)",
                fontWeight: mode === m ? 500 : 400,
              }}
            >
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-2)" }}>Username</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Choose a username"
                  required={mode === "signup"}
                  className="w-full text-sm px-3 py-2 rounded-lg transition-colors"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(244,63,94,0.4)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-2)" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full text-sm px-3 py-2 rounded-lg transition-colors"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                onFocus={e => (e.target.style.borderColor = "rgba(244,63,94,0.4)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-2)" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full text-sm px-3 py-2 rounded-lg transition-colors"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                onFocus={e => (e.target.style.borderColor = "rgba(244,63,94,0.4)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
              {mode === "signup" && (
                <p className="text-xs mt-1.5" style={{ color: "var(--text-3)" }}>Minimum 8 characters</p>
              )}
            </div>
          </div>

          {mode === "signup" && (
            <p className="text-xs leading-relaxed px-1" style={{ color: "#555" }}>
              By creating an account you agree to our{" "}
              <a href="/tos" target="_blank" rel="noopener noreferrer" style={{ color: "#888" }}>Terms of Service</a>{" "}
              and acknowledge that DeepPuts provides AI-generated analysis for informational purposes only — not investment advice.
            </p>
          )}

          {error && (
            <div className="rounded-lg px-4 py-3 text-xs" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "#f87171" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-medium rounded-xl transition-all"
            style={{ background: loading ? "rgba(244,63,94,0.5)" : "#f43f5e", color: "#fff", cursor: loading ? "not-allowed" : "pointer" }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#fb4f6b"; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#f43f5e"; }}
          >
            {loading ? (mode === "signup" ? "Creating account…" : "Signing in…") : (mode === "signup" ? "Create Account" : "Sign In")}
          </button>
        </form>

        {/* Footer links */}
        <div className="mt-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-3 text-xs" style={{ color: "#444" }}>
            <a href="/tos" target="_blank" rel="noopener noreferrer" style={{ color: "#444" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#888")}
              onMouseLeave={e => (e.currentTarget.style.color = "#444")}
            >Terms of Service</a>
            <span>·</span>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#444" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#888")}
              onMouseLeave={e => (e.currentTarget.style.color = "#444")}
            >Privacy Policy</a>
          </div>
          <p className="text-xs" style={{ color: "#333" }}>
            Not financial advice. For informational purposes only.
          </p>
        </div>
      </div>
    </div>
  );
}
