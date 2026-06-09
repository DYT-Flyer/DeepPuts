"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Nav } from "@/components/nav";
import { EventFeedRow } from "@/components/event-feed-item";
import type { EventFeedItem } from "@/types";

export default function EventsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<EventFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetClass, setAssetClass] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 50;

  const fetchEvents = useCallback(
    async (reset = false) => {
      const offset = reset ? 0 : page * LIMIT;
      setLoading(true);
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      if (assetClass) params.set("assetClass", assetClass);

      const res = await fetch(`/api/events?${params}`);
      if (res.ok) {
        const data: EventFeedItem[] = await res.json();
        if (reset) {
          setItems(data);
          setPage(0);
        } else {
          setItems((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === LIMIT);
      }
      setLoading(false);
    },
    [page, assetClass]
  );

  useEffect(() => {
    fetchEvents(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetClass]);

  function loadMore() {
    setPage((p) => p + 1);
  }

  useEffect(() => {
    if (page > 0) fetchEvents(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav userEmail={session?.user?.email} />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Event Feed</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              All ingested market events, newest first
            </p>
          </div>
          <select
            value={assetClass}
            onChange={(e) => setAssetClass(e.target.value)}
            className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-2 py-1.5 focus:outline-none"
          >
            <option value="">All assets</option>
            <option value="stock">Stocks</option>
            <option value="crypto">Crypto</option>
          </select>
        </div>

        {/* Feed */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1">
          {loading && items.length === 0 ? (
            <div className="space-y-3 p-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-12 bg-zinc-800 rounded animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-zinc-500 text-sm">No events yet</p>
              <p className="text-zinc-600 text-xs mt-1">Start the scheduler to begin ingesting events</p>
            </div>
          ) : (
            <>
              {items.map((item) => (
                <EventFeedRow key={item.id} item={item} />
              ))}
              {hasMore && (
                <div className="p-3 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors"
                  >
                    {loading ? "Loading..." : "Load more"}
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
