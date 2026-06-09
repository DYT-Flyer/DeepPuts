"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { Nav } from "@/components/nav";
import { OpportunityCard } from "@/components/opportunity-card";
import { Sparkline } from "@/components/sparkline";
import type { OpportunityItem, SparklinePoint } from "@/types";

export default function TickerPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const upper = symbol.toUpperCase();
  const { data: session } = useSession();

  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [sparkline, setSparkline] = useState<SparklinePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [eventsRes, sparkRes] = await Promise.all([
        fetch(`/api/ticker/${upper}`),
        fetch(`/api/ticker/${upper}/sparkline`),
      ]);

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setItems(data.items || []);
      }
      if (sparkRes.ok) {
        const data = await sparkRes.json();
        setSparkline(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    }
    load();
  }, [upper]);

  const avgConviction =
    items.length > 0
      ? (items.reduce((s, i) => s + i.convictionScore, 0) / items.length).toFixed(1)
      : null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav userEmail={session?.user?.email} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Ticker header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold font-mono text-zinc-100">{upper}</h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                {items.length} flagged event{items.length !== 1 ? "s" : ""}
                {avgConviction && ` · avg conviction ${avgConviction}/10`}
              </p>
            </div>
            {items.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-zinc-500">Bear bias</p>
                <p
                  className={`text-2xl font-bold font-mono ${
                    Number(avgConviction) >= 7
                      ? "text-red-400"
                      : Number(avgConviction) >= 4
                      ? "text-yellow-400"
                      : "text-zinc-400"
                  }`}
                >
                  {avgConviction}/10
                </p>
              </div>
            )}
          </div>

          {/* Sparkline */}
          <Sparkline data={sparkline} height={100} />
        </div>

        {/* Events */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg h-48 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-sm">No events flagged for {upper}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((item) => (
              <OpportunityCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
