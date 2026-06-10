"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { OpportunityCard } from "@/components/opportunity-card";
import { Star, X } from "lucide-react";
import Link from "next/link";
import type { OpportunityItem } from "@/types";

export default function WatchlistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [tickerStats, setTickerStats] = useState<Record<string, { thesisCount: number; highConvictionCount: number }>>({});
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/watchlist")
      .then(r => r.json())
      .then(d => { setSymbols(d.symbols || []); setTickerStats(d.stats || {}); });
  }, [session]);

  useEffect(() => {
    if (symbols.length === 0) { setItems([]); setLoading(false); return; }
    setLoading(true);
    Promise.all(
      symbols.map(sym =>
        fetch(`/api/ticker/${sym}`)
          .then(r => r.json())
          .then(d => (d.items || []) as OpportunityItem[])
      )
    ).then(results => {
      const seen = new Set<string>();
      const merged: OpportunityItem[] = [];
      for (const group of results) {
        for (const item of group) {
          if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); }
        }
      }
      merged.sort((a, b) => b.convictionScore - a.convictionScore || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(merged);
      setLoading(false);
    });
  }, [symbols]);

  async function unwatch(symbol: string) {
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    });
    setSymbols(prev => prev.filter(s => s !== symbol));
  }

  if (status === "loading") return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Nav userEmail={session?.user?.email} userName={session?.user?.name} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Star size={16} style={{ color: "#f59e0b" }} />
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>Watchlist</h1>
        </div>

        {/* Watched tickers */}
        {symbols.length === 0 ? (
          <div className="text-center py-20 rounded-xl mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <Star size={28} style={{ color: "#333", margin: "0 auto 12px" }} />
            <p className="text-sm" style={{ color: "var(--text-3)" }}>Your watchlist is empty</p>
            <p className="text-xs mt-1" style={{ color: "#333" }}>
              Visit a{" "}
              <Link href="/opportunities" style={{ color: "#666" }} onMouseEnter={e => (e.currentTarget.style.color = "#aaa")} onMouseLeave={e => (e.currentTarget.style.color = "#666")}>ticker page</Link>
              {" "}and click the star to start tracking
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap mb-6">
              {symbols.map(sym => {
                const s = tickerStats[sym];
                return (
                  <div key={sym} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <Link href={`/ticker/${sym}`}
                      className="text-xs font-mono transition-colors font-medium"
                      style={{ color: "#aaa" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
                    >
                      {sym}
                    </Link>
                    {s && s.thesisCount > 0 && (
                      <>
                        <span style={{ color: "#2a2a2a", fontSize: "10px" }}>·</span>
                        <span className="text-xs font-mono" style={{ color: "#555" }} title={`${s.thesisCount} bear theses`}>
                          {s.thesisCount}
                        </span>
                        {s.highConvictionCount > 0 && (
                          <span className="text-xs font-mono" style={{ color: "#f43f5e" }} title={`${s.highConvictionCount} high conviction`}>
                            {s.highConvictionCount}↑
                          </span>
                        )}
                      </>
                    )}
                    <button onClick={() => unwatch(sym)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0", color: "#333", lineHeight: 1, marginLeft: "2px" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#666")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#333")}
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Opportunities for watched tickers */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Flagged Events</h2>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-52 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-sm" style={{ color: "var(--text-3)" }}>No flagged events for your watched tickers yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.map(item => <OpportunityCard key={item.id} item={item} loggedIn={!!session} />)}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
