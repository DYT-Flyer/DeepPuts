"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, TrendingDown } from "lucide-react";
import { Nav } from "@/components/nav";
import { OpportunityCard } from "@/components/opportunity-card";
import type { OpportunityItem } from "@/types";

const SECTOR_LABELS: Record<string, string> = {
  technology: "Technology",
  healthcare: "Healthcare",
  energy: "Energy",
  financials: "Financials",
  consumer: "Consumer",
  industrials: "Industrials",
  materials: "Materials",
  utilities: "Utilities",
  "real estate": "Real Estate",
  crypto: "Crypto",
  macro: "Macro",
};

export default function SectorPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const sectorLabel = SECTOR_LABELS[decodeURIComponent(name).toLowerCase()] ?? decodeURIComponent(name);
  const { data: session } = useSession();
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/opportunities?sector=${encodeURIComponent(sectorLabel)}&limit=60&sortBy=score`)
      .then(r => r.ok ? r.json() : [])
      .then((d: OpportunityItem[]) => setItems(d))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [sectorLabel]);

  const highConviction = items.filter(i => i.convictionScore >= 7);
  const rest = items.filter(i => i.convictionScore < 7);
  const avgScore = items.length > 0
    ? (items.reduce((s, i) => s + i.convictionScore, 0) / items.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Nav userEmail={session?.user?.email} userName={session?.user?.name} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Link href="/opportunities"
          className="inline-flex items-center gap-1.5 text-xs mb-6 transition-colors"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
        >
          <ArrowLeft size={12} /> Bear Theses
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <TrendingDown size={18} style={{ color: "#f43f5e" }} />
              <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
                {sectorLabel}
              </h1>
            </div>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              Bearish theses for the {sectorLabel} sector
            </p>
          </div>
          {!loading && items.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className="text-xs px-2.5 py-1.5 rounded-lg"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
                {items.length} {items.length === 1 ? "thesis" : "theses"}
              </span>
              {highConviction.length > 0 && (
                <span className="text-xs px-2.5 py-1.5 rounded-lg"
                  style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "#f43f5e" }}>
                  {highConviction.length} high conviction
                </span>
              )}
              {avgScore && (
                <span className="text-xs px-2.5 py-1.5 rounded-lg"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
                  avg {avgScore}/10
                </span>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-32 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <TrendingDown size={32} style={{ color: "#222", margin: "0 auto 12px" }} />
            <p className="text-sm" style={{ color: "var(--text-3)" }}>No bear theses for {sectorLabel} yet</p>
            <p className="text-xs mt-1" style={{ color: "#333" }}>Check back after the next scheduler run</p>
          </div>
        ) : (
          <div className="space-y-8">
            {highConviction.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#f43f5e" }}>High Conviction</h2>
                  <div className="flex-1 h-px" style={{ background: "rgba(244,63,94,0.15)" }} />
                  <span className="text-xs" style={{ color: "var(--text-3)" }}>{highConviction.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {highConviction.map(item => <OpportunityCard key={item.id} item={item} loggedIn={!!session} />)}
                </div>
              </section>
            )}
            {rest.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Monitoring</h2>
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                  <span className="text-xs" style={{ color: "var(--text-3)" }}>{rest.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {rest.map(item => <OpportunityCard key={item.id} item={item} loggedIn={!!session} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
