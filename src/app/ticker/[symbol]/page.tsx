"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { Nav } from "@/components/nav";
import { OpportunityCard } from "@/components/opportunity-card";
import { Sparkline } from "@/components/sparkline";
import { ArrowLeft, Star } from "lucide-react";
import Link from "next/link";
import type { OpportunityItem, SparklinePoint } from "@/types";

export default function TickerPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const upper = symbol.toUpperCase();
  const { data: session } = useSession();
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [sparkline, setSparkline] = useState<SparklinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState(false);
  const [watchLoading, setWatchLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [eventsRes, sparkRes] = await Promise.all([
        fetch(`/api/ticker/${upper}`),
        fetch(`/api/ticker/${upper}/sparkline`),
      ]);
      if (eventsRes.ok) { const d = await eventsRes.json(); setItems(d.items || []); }
      if (sparkRes.ok) { const d = await sparkRes.json(); setSparkline(Array.isArray(d) ? d : []); }
      setLoading(false);
    }
    load();
  }, [upper]);

  useEffect(() => {
    if (!session) { setWatchLoading(false); return; }
    fetch("/api/watchlist")
      .then(r => r.json())
      .then(d => { setWatching((d.symbols as string[]).includes(upper)); setWatchLoading(false); });
  }, [upper, session]);

  async function toggleWatch() {
    if (!session || watchLoading) return;
    setWatchLoading(true);
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: upper }),
    });
    if (res.ok) {
      const d = await res.json();
      setWatching(d.watching);
    }
    setWatchLoading(false);
  }

  const avgConviction = items.length > 0
    ? (items.reduce((s, i) => s + i.convictionScore, 0) / items.length).toFixed(1)
    : null;
  const highConvictionCount = items.filter(i => i.convictionScore >= 7).length;

  const isHigh = Number(avgConviction) >= 7;
  const isMid = Number(avgConviction) >= 4;
  const scoreColor = isHigh ? "#f43f5e" : isMid ? "#f59e0b" : "#555";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Nav userEmail={session?.user?.email} userName={session?.user?.name} />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Back */}
        <Link href="/opportunities"
          className="inline-flex items-center gap-1.5 text-xs mb-6 transition-colors"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
        >
          <ArrowLeft size={12} /> Back to Opportunities
        </Link>

        {/* Ticker header card */}
        <div className="rounded-xl p-6 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-start justify-between mb-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text)" }}>{upper}</h1>
                {session && (
                  <button
                    onClick={toggleWatch}
                    disabled={watchLoading}
                    title={watching ? "Remove from watchlist" : "Add to watchlist"}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: watchLoading ? "default" : "pointer",
                      padding: "4px",
                      borderRadius: "6px",
                      color: watching ? "#f59e0b" : "#444",
                      transition: "color 0.15s",
                      opacity: watchLoading ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { if (!watchLoading) e.currentTarget.style.color = watching ? "#fbbf24" : "#666"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = watching ? "#f59e0b" : "#444"; }}
                  >
                    <Star size={18} fill={watching ? "#f59e0b" : "none"} />
                  </button>
                )}
              </div>
              
              {items.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2.5 py-1 rounded-md font-medium" style={{ background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
                    {items.length} bear {items.length === 1 ? "thesis" : "theses"}
                  </span>
                  {highConvictionCount > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-md font-medium" style={{ background: "rgba(244,63,94,0.08)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.2)" }}>
                      {highConvictionCount} high conviction
                    </span>
                  )}
                </div>
              )}
            </div>

            {avgConviction && (
              <div className="flex flex-col items-end">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-80" style={{ color: scoreColor }}>Bear Bias</p>
                <div className="flex items-baseline gap-1 px-3 py-1.5 rounded-xl shadow-sm transition-all" style={{ background: `${scoreColor}15`, border: `1px solid ${scoreColor}40` }}>
                  <span className="text-3xl font-black tracking-tighter leading-none" style={{ color: scoreColor, textShadow: `0 0 20px ${scoreColor}80` }}>
                    {avgConviction}
                  </span>
                  <span className="text-sm font-bold opacity-60 leading-none" style={{ color: scoreColor }}>/10</span>
                </div>
              </div>
            )}
          </div>
          <Sparkline data={sparkline} height={110} />
        </div>

        {/* Events grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-52 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>No events flagged for {upper}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map(item => <OpportunityCard key={item.id} item={item} loggedIn={!!session} />)}
          </div>
        )}
      </main>
    </div>
  );
}
