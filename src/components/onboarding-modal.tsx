"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export function OnboardingModal() {
  const { data: session, status } = useSession();
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    fetch("/api/user/me")
      .then(r => r.json())
      .then(d => { if (!d.acceptedTermsAt) setShow(true); })
      .catch(() => {});
  }, [status, session?.user?.id]);

  async function accept() {
    if (!checked) return;
    setAccepting(true);
    await fetch("/api/user/accept-terms", { method: "POST" });
    setShow(false);
    setAccepting(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="mb-5">
          <h2 className="text-base font-bold mb-1" style={{ color: "var(--text)" }}>Welcome to DeepPuts</h2>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>AI-powered bearish market intelligence</p>
        </div>

        {/* Disclosure */}
        <div className="rounded-xl p-4 mb-5 space-y-2 text-xs leading-relaxed"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
          <p style={{ color: "var(--text-2)" }}>
            <strong style={{ color: "var(--text)" }}>Not financial advice.</strong> DeepPuts is a research tool. All analysis is AI-generated and may be inaccurate, incomplete, or hallucinated.
          </p>
          <p style={{ color: "var(--text-2)" }}>
            <strong style={{ color: "var(--text)" }}>Infinite risk warning.</strong> Short selling and put options carry the risk of unlimited losses. Never invest more than you can afford to lose.
          </p>
          <p style={{ color: "var(--text-2)" }}>
            <strong style={{ color: "var(--text)" }}>No guarantees.</strong> Past signal performance is not indicative of future results. Always conduct independent due diligence.
          </p>
        </div>

        {/* Single checkbox */}
        <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", marginBottom: "20px" }}>
          <div style={{
            position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            marginTop: "1px", flexShrink: 0, width: "16px", height: "16px",
            borderRadius: "4px", border: `1px solid ${checked ? "#f43f5e" : "var(--border)"}`,
            background: checked ? "#f43f5e" : "transparent", transition: "all 0.15s",
          }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer", margin: 0 }}
            />
            {checked && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span style={{ fontSize: "0.75rem", lineHeight: "1.5", color: "var(--text-2)" }}>
            I understand DeepPuts is a research tool, not financial advice, and I accept the{" "}
            <a href="/tos" target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--text)", textDecoration: "underline" }}
              onClick={e => e.stopPropagation()}>Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--text)", textDecoration: "underline" }}
              onClick={e => e.stopPropagation()}>Privacy Policy</a>.
          </span>
        </label>

        <button
          onClick={accept}
          disabled={!checked || accepting}
          style={{
            width: "100%", padding: "10px", fontSize: "0.875rem", fontWeight: 600,
            borderRadius: "12px", border: "none", cursor: checked && !accepting ? "pointer" : "not-allowed",
            background: checked && !accepting ? "linear-gradient(135deg, #f43f5e, #e11d48)" : "var(--surface-2)",
            color: checked && !accepting ? "#fff" : "var(--text-3)",
            transition: "filter 0.15s",
          }}
          onMouseEnter={e => { if (checked && !accepting) e.currentTarget.style.filter = "brightness(1.1)"; }}
          onMouseLeave={e => { if (checked && !accepting) e.currentTarget.style.filter = ""; }}
        >
          {accepting ? "Saving…" : "Enter DeepPuts"}
        </button>
      </div>
    </div>
  );
}
