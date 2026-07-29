"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { CheckCircle, TrendingDown, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function PricingPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const isPro = (session?.user as any)?.tier === "PRO";

  async function handleUpgrade() {
    if (!session) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session");
        setLoading(false);
      }
    } catch {
      alert("Error initiating checkout");
      setLoading(false);
    }
  }

  async function handleManage() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to open billing portal");
        setLoading(false);
      }
    } catch {
      alert("Error opening billing portal");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      <div className="mb-12 text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
          <TrendingDown size={24} style={{ color: "#f43f5e" }} />
          <span className="text-xl font-bold tracking-tight text-white">Deep<span style={{ color: "#f43f5e" }}>Puts</span></span>
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-4 text-white">
          {isPro ? "Your Subscription" : "Upgrade to DeepPuts Pro"}
        </h1>
        <p className="text-lg" style={{ color: "var(--text-2)" }}>
          {isPro ? "You have full access to all Pro features." : "Unlock real-time AI analysis, infinite history, and high-conviction alerts."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* FREE TIER */}
        <div className="rounded-2xl p-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-2xl font-bold mb-2 text-white">Free</h2>
          <p className="text-4xl font-extrabold mb-6 text-white">$0<span className="text-sm font-medium" style={{ color: "var(--text-3)" }}>/month</span></p>

          <ul className="space-y-4 mb-8">
            {["View basic market events", "Delayed performance data", "Community discussion access"].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-2)" }}>
                <CheckCircle size={16} style={{ color: "var(--text-3)" }} />
                {feature}
              </li>
            ))}
          </ul>

          <button disabled className="w-full py-3 rounded-xl font-medium text-sm" style={{ background: "var(--surface-2)", color: "var(--text-3)", cursor: "not-allowed" }}>
            {isPro ? "Basic Plan" : "Current Plan"}
          </button>
        </div>

        {/* PRO TIER */}
        <div className="rounded-2xl p-8 relative overflow-hidden shadow-2xl transform md:-translate-y-4" style={{ background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.4)", backdropFilter: "blur(12px)" }}>
          {isPro ? (
            <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold" style={{ background: "#22c55e", color: "#fff" }}>ACTIVE</div>
          ) : (
            <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold" style={{ background: "#f43f5e", color: "#fff" }}>RECOMMENDED</div>
          )}
          <h2 className="text-2xl font-bold mb-2 text-white">Pro</h2>
          <p className="text-4xl font-extrabold mb-6" style={{ color: "#f43f5e" }}>$19.99<span className="text-sm font-medium" style={{ color: "var(--text-3)" }}>/month</span></p>

          <ul className="space-y-4 mb-8">
            {["Unlimited AI bear thesis analysis", "Real-time price tracking & horizons", "Instant email alerts for high-conviction signals", "View exact catalyst dates & time horizons", "Priority support"].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-white">
                <CheckCircle size={16} style={{ color: "#f43f5e" }} />
                {feature}
              </li>
            ))}
          </ul>

          {isPro ? (
            <button
              onClick={handleManage}
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              style={{
                background: loading ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)",
                color: loading ? "var(--text-3)" : "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
                cursor: loading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            >
              {loading ? "Redirecting…" : <><ExternalLink size={14} />Manage Subscription</>}
            </button>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg"
              style={{
                background: loading ? "rgba(244,63,94,0.5)" : "linear-gradient(135deg, #f43f5e, #fb7185)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                cursor: loading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = "brightness(1.1)"; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.filter = "brightness(1)"; }}
            >
              {loading ? "Redirecting…" : "Upgrade Now"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
