import Link from "next/link";
import { TrendingDown } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
          style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.15)" }}>
          <TrendingDown size={24} style={{ color: "#f43f5e" }} />
        </div>
        <p className="text-xs font-mono mb-3" style={{ color: "#444" }}>404</p>
        <h1 className="text-2xl font-semibold tracking-tight mb-3" style={{ color: "var(--text)" }}>
          Thesis not found
        </h1>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--text-3)" }}>
          This page may have been removed or the URL is incorrect.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/"
            className="text-sm px-4 py-2 rounded-xl transition-all"
            style={{ background: "#f43f5e", color: "#fff" }}
            onMouseEnter={undefined}
          >
            Dashboard
          </Link>
          <Link href="/opportunities"
            className="text-sm px-4 py-2 rounded-xl transition-all"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-2)" }}
          >
            Bear Theses
          </Link>
        </div>
      </div>
    </div>
  );
}
