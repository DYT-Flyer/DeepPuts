"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Nav } from "@/components/nav";
import { OpportunityCard } from "@/components/opportunity-card";
import { RefreshCw } from "lucide-react";
import type { OpportunityItem } from "@/types";

export default function PopularPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/opportunities?sortBy=popular&limit=50");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <Nav userEmail={session?.user?.email} userName={session?.user?.name} />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Popular</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
              The most debated and upvoted analyses from the community.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
              cursor: refreshing || loading ? "not-allowed" : "pointer",
              opacity: refreshing || loading ? 0.5 : 1
            }}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading && items.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 rounded-xl animate-pulse"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>No popular opportunities found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <OpportunityCard key={item.id} item={item} loggedIn={!!session?.user} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
