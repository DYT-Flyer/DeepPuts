"use client";

import Link from "next/link";
import { TrendingDown } from "lucide-react";

export function DisclaimerFooter() {
  return (
    <footer style={{ marginTop: "64px", borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
      {/* Main footer grid */}
      <div className="max-w-7xl mx-auto" style={{ padding: "48px 24px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "40px" }}
          className="footer-grid">

          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <TrendingDown size={18} style={{ color: "#f43f5e" }} />
              <span style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em" }}>
                Deep<span style={{ color: "#f43f5e" }}>Puts</span>
              </span>
            </div>
            <p style={{ color: "var(--text-3)", fontSize: "0.8rem", lineHeight: 1.6, maxWidth: "260px", margin: "0 0 16px" }}>
              AI-powered bearish market intelligence. Track short-side signals, conviction scores, and catalyst timelines.
            </p>
            <p style={{ color: "var(--text-3)", fontSize: "0.75rem", margin: 0 }}>
              Data by <span style={{ color: "var(--text-2)" }}>Polygon.io</span> · AI by <span style={{ color: "var(--text-2)" }}>Google Gemini</span>
            </p>
          </div>

          {/* Product */}
          <div>
            <p style={{ color: "var(--text)", fontWeight: 600, fontSize: "0.8rem", marginBottom: "14px" }}>Product</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { href: "/", label: "Home" },
                { href: "/opportunities", label: "Opportunities" },
                { href: "/events", label: "Events" },
                { href: "/popular", label: "Popular" },
                { href: "/pricing", label: "Pricing" },
              ].map(({ href, label }) => (
                <Link key={href} href={href}
                  style={{ color: "var(--text-3)", fontSize: "0.8rem", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div>
            <p style={{ color: "var(--text)", fontWeight: 600, fontSize: "0.8rem", marginBottom: "14px" }}>Legal</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { href: "/tos", label: "Terms of Service" },
                { href: "/privacy", label: "Privacy Policy" },
              ].map(({ href, label }) => (
                <Link key={href} href={href}
                  style={{ color: "var(--text-3)", fontSize: "0.8rem", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <p style={{ color: "var(--text)", fontWeight: 600, fontSize: "0.8rem", marginBottom: "14px" }}>Company</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <a href="mailto:support@deepputs.com"
                style={{ color: "var(--text-3)", fontSize: "0.8rem", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}>
                support@deepputs.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer bar */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "20px 24px" }}>
        <div className="max-w-7xl mx-auto">
          <p style={{ color: "#2e2e2e", fontSize: "0.7rem", lineHeight: 1.6, marginBottom: "8px" }}>
            DeepPuts provides AI-generated market analysis for research and educational purposes only.
            Nothing on this platform constitutes investment advice, a solicitation to trade, or a recommendation
            to buy or sell any security or derivative. Conviction scores are experimental metrics and do not
            predict returns or price movements. Short selling and options trading carry significant risk,
            including the potential loss of more than your initial investment.
            Past signal performance does not indicate future results. DeepPuts is not a registered investment
            advisor, broker-dealer, or financial institution. Always conduct independent due diligence before
            making any investment decision. Use at your own risk.
          </p>
          <p style={{ color: "#2a2a2a", fontSize: "0.7rem", margin: 0 }}>
            © {new Date().getFullYear()} DeepPuts · Not financial advice
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 32px !important;
          }
        }
        @media (max-width: 480px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
