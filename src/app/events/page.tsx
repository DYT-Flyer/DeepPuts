"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Nav } from "@/components/nav";
import { EventFeedRow } from "@/components/event-feed-item";
import type { EventFeedItem } from "@/types";

function groupByDay(items: EventFeedItem[]): Array<{ label: string; events: EventFeedItem[] }> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const groups = new Map<string, EventFeedItem[]>();
  for (const item of items) {
    const d = new Date(item.publishedAt);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = fmt(d);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(item);
  }
  return [...groups.entries()].map(([label, events]) => ({ label, events }));
}

export default function EventsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<EventFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetClass, setAssetClass] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 50;

  const fetchEvents = useCallback(async (reset = false) => {
    const offset = reset ? 0 : page * LIMIT;
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
    if (assetClass) params.set("assetClass", assetClass);
    const res = await fetch(`/api/events?${params}`);
    if (res.ok) {
      const data: EventFeedItem[] = await res.json();
      if (reset) { setItems(data); setPage(0); } else { setItems(prev => [...prev, ...data]); }
      setHasMore(data.length === LIMIT);
    }
    setLoading(false);
  }, [page, assetClass]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchEvents(true);
  }, [assetClass]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { 
    if (page > 0) fetchEvents(false); 
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }} suppressHydrationWarning>
      <Nav userEmail={session?.user?.email} userName={session?.user?.name} />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>Event Feed</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>All ingested market events, newest first</p>
          </div>
          <div className="flex items-center gap-2">
            {["", "stock", "crypto"].map(v => (
              <button key={v} onClick={() => setAssetClass(v)}
                className="text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: assetClass === v ? "rgba(255,255,255,0.08)" : "var(--surface)",
                  border: `1px solid ${assetClass === v ? "var(--border-hover)" : "var(--border)"}`,
                  color: assetClass === v ? "var(--text)" : "var(--text-2)",
                }}
              >
                {v === "" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        <div className="overflow-hidden">
          {loading && items.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "var(--surface-2)" }} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--text-3)" }}>No events yet</p>
              <p className="text-xs mt-1" style={{ color: "#333" }}>Start the scheduler to begin ingesting events</p>
            </div>
          ) : (
            <>
              {groupByDay(items).map(({ label, events }) => (
                <div key={label} className="mb-6">
                  <div className="py-2 flex items-center gap-3 sticky top-14 z-10 mb-2"
                    style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.5)" }}>
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>{label}</span>
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "#555", border: "1px solid var(--border)" }}>
                      {events.length}
                    </span>
                    <span className="text-xs" style={{ color: "#555" }}>
                      {events.filter(e => e.analysis).length} analyzed
                    </span>
                  </div>
                  {events.map(item => <EventFeedRow key={item.id} item={item} loggedIn={!!session} />)}
                </div>
              ))}
              {hasMore && (
                <div className="p-4 text-center" style={{ borderTop: "1px solid var(--border)" }}>
                  <button onClick={() => setPage(p => p + 1)} disabled={loading}
                    className="text-xs transition-colors"
                    style={{ color: "var(--text-3)", cursor: loading ? "not-allowed" : "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                  >
                    {loading ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
