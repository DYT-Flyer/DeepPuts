import Link from "next/link";
import { TrendingDown } from "lucide-react";

export const metadata = { title: "Privacy Policy — DeepPuts" };

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header className="border-b" style={{ borderColor: "var(--border)", background: "rgba(8,8,8,0.9)" }}>
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <TrendingDown size={16} style={{ color: "#f43f5e" }} />
            <span className="text-sm font-bold tracking-tight text-white">
              Deep<span style={{ color: "#f43f5e" }}>Puts</span>
            </span>
          </Link>
          <Link href="/" className="text-xs" style={{ color: "var(--text-3)" }}>← Back</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: "var(--text)" }}>Privacy Policy</h1>
          <p className="text-sm" style={{ color: "var(--text-3)" }}>Last updated: June 2026</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>1. Information We Collect</h2>
            <p className="mb-3">When you create an account and use DeepPuts, we collect:</p>
            <ul className="space-y-1.5 ml-4">
              {[
                "Email address and username (required for account creation)",
                "Hashed password (we never store plaintext passwords)",
                "Content you post: comments, votes, watchlist entries",
                "Usage data: pages visited, features used, search queries",
                "Session data required for authentication",
              ].map((item, i) => (
                <li key={i} className="flex gap-2"><span style={{ color: "#444" }}>•</span>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>2. How We Use Your Information</h2>
            <ul className="space-y-1.5 ml-4">
              {[
                "To authenticate your account and maintain your session",
                "To display your comments, votes, and watchlist",
                "To send alert notifications (if you enable them)",
                "To improve the Platform based on aggregate usage patterns",
                "To enforce our Terms of Service and prevent abuse",
              ].map((item, i) => (
                <li key={i} className="flex gap-2"><span style={{ color: "#444" }}>•</span>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>3. Third-Party Services</h2>
            <p className="mb-3">DeepPuts uses the following third-party services:</p>
            <ul className="space-y-2 ml-4">
              {[
                { name: "Polygon.io", purpose: "Market data and financial news. Subject to Polygon.io's terms and privacy policy." },
                { name: "Anthropic Claude", purpose: "AI analysis generation. Event headlines and summaries are sent to Claude for analysis. No personal user data is sent to Anthropic." },
              ].map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span style={{ color: "#444" }}>•</span>
                  <span><strong style={{ color: "var(--text)" }}>{s.name}:</strong> {s.purpose}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>4. Data Storage</h2>
            <p>Your data is stored in a database hosted on our infrastructure. We do not sell your personal data to third parties. We implement reasonable security measures to protect against unauthorized access.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>5. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="space-y-1.5 ml-4">
              {[
                "Access and download your personal data",
                "Delete your account and associated data",
                "Correct inaccurate profile information",
                "Opt out of notification emails at any time",
              ].map((item, i) => (
                <li key={i} className="flex gap-2"><span style={{ color: "#444" }}>•</span>{item}</li>
              ))}
            </ul>
            <p className="mt-3">To exercise these rights, contact us or use the account deletion option in your profile settings.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>6. Cookies and Sessions</h2>
            <p>We use session cookies to maintain your authenticated state. No advertising or tracking cookies are used. Session data is cleared when you sign out.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>7. Changes to This Policy</h2>
            <p>We may update this policy from time to time. Continued use of the Platform after changes are posted constitutes acceptance of the updated policy.</p>
          </section>

        </div>

        <div className="mt-12 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
          <Link href="/tos" className="text-xs transition-colors" style={{ color: "var(--text-3)" }}>
            Terms of Service →
          </Link>
        </div>
      </main>
    </div>
  );
}
