"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { TrendingDown } from "lucide-react";

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
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)" }}>
            <TrendingDown size={18} style={{ color: "#f43f5e" }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>Welcome to DeepPuts</h2>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>AI-powered bearish market intelligence</p>
          </div>
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
        <label className="flex items-start gap-3 cursor-pointer mb-5">
          <div className="relative flex items-center justify-center mt-0.5 shrink-0 w-4 h-4 rounded border transition-all"
            style={{ borderColor: checked ? "#f43f5e" : "var(--border)", background: checked ? "#f43f5e" : "transparent" }}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="absolute opacity-0 w-full h-full cursor-pointer"
            />
            {checked && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
            I understand DeepPuts is a research tool, not financial advice, and I accept the{" "}
            <a href="/tos" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text)", textDecoration: "underline" }} onClick={e => e.stopPropagation()}>Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text)", textDecoration: "underline" }} onClick={e => e.stopPropagation()}>Privacy Policy</a>.
          </span>
        </label>

        <button
          onClick={accept}
          disabled={!checked || accepting}
          className="w-full py-2.5 text-sm font-semibold rounded-xl transition-all"
          style={{
            background: checked && !accepting ? "linear-gradient(135deg, #f43f5e, #e11d48)" : "var(--surface-2)",
            color: checked && !accepting ? "#fff" : "var(--text-3)",
            cursor: checked && !accepting ? "pointer" : "not-allowed",
            border: "1px solid transparent",
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
