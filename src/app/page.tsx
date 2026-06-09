"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Nav } from "@/components/nav";
import { OpportunityCard } from "@/components/opportunity-card";
import type { OpportunityItem, SignalType } from "@/types";

const SIGNAL_TYPES: SignalType[] = [
  "earnings_miss",
  "sec_filing",
  "news_negative",
  "macro",
  "crypto_dump",
  "insider_sell",
  "guidance_cut",
  "regulatory",
];

const SECTORS = [
  "Technology",
  "Healthcare",
  "Energy",
  "Financials",
  "Consumer",
  "Industrials",
  "Materials",
  "Utilities",
  "Real Estate",
  "Crypto",
  "Macro",
];

export default function OpportunityBoard() {
  const { data: session } = useSession();
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [minScore, setMinScore] = useState(1);
  const [signalType, setSignalType] = useState("");
  const [sector, setSector] = useState("");
  const [assetClass, setAssetClass] = useState("");

  // Scheduler status
  const [schedulerStatus, setSchedulerStatus] = useState<{
    lastRun: { status: string; startedAt: string; eventsFound: number; eventsAnalyzed: number } | null;
    totalEvents: number;
    totalAnalyzed: number;
  } | null>(null);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (minScore > 1) params.set("minScore", String(minScore));
    if (signalType) params.set("signalType", signalType);
    if (sector) params.set("sector", sector);
    if (assetClass) params.set("assetClass", assetClass);
    params.set("limit", "60");

    const res = await fetch(`/api/opportunities?${params}`);
    if (res.ok) {
      setItems(await res.json());
    }
    setLoading(false);
  }, [minScore, signalType, sector, assetClass]);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/scheduler-status");
    if (res.ok) setSchedulerStatus(await res.json());
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function triggerRefresh() {
    setRefreshing(true);
    await fetch("/api/cron", { method: "POST" });
    // Poll for completion
    setTimeout(() => {
      fetchStatus();
      fetchOpportunities();
      setRefreshing(false);
    }, 3000);
  }

  const highConviction = items.filter((i) => i.convictionScore >= 7);
  const rest = items.filter((i) => i.convictionScore < 7);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav userEmail={session?.user?.email} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Opportunity Board</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {schedulerStatus
                ? `${schedulerStatus.totalAnalyzed} events analyzed · Last run: ${schedulerStatus.lastRun ? formatAge(schedulerStatus.lastRun.startedAt) : "never"}`
                : "Loading status..."}
            </p>
          </div>
          <button
            onClick={triggerRefresh}
            disabled={refreshing}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 px-3 py-1.5 rounded border border-zinc-700 transition-colors"
          >
            {refreshing ? "Refreshing..." : "Refresh Now"}
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <FilterSelect
            value={assetClass}
            onChange={setAssetClass}
            options={[
              { value: "", label: "All assets" },
              { value: "stock", label: "Stocks" },
              { value: "crypto", label: "Crypto" },
            ]}
          />
          <FilterSelect
            value={signalType}
            onChange={setSignalType}
            options={[
              { value: "", label: "All signals" },
              ...SIGNAL_TYPES.map((s) => ({ value: s, label: formatSignal(s) })),
            ]}
          />
          <FilterSelect
            value={sector}
            onChange={setSector}
            options={[
              { value: "", label: "All sectors" },
              ...SECTORS.map((s) => ({ value: s, label: s })),
            ]}
          />
          <FilterSelect
            value={String(minScore)}
            onChange={(v) => setMinScore(Number(v))}
            options={[
              { value: "1", label: "All conviction" },
              { value: "4", label: "Score ≥ 4" },
              { value: "7", label: "Score ≥ 7" },
              { value: "9", label: "Score ≥ 9" },
            ]}
          />
          <span className="text-xs text-zinc-600 ml-auto">
            {items.length} results
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 h-48 animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-zinc-500 text-sm">No opportunities found</p>
            <p className="text-zinc-600 text-xs mt-1">
              Run the scheduler or adjust your filters
            </p>
          </div>
        ) : (
          <>
            {highConviction.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">
                  High Conviction (7–10)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {highConviction.map((item) => (
                    <OpportunityCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  Monitoring (1–6)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {rest.map((item) => (
                    <OpportunityCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-2 py-1.5 focus:outline-none focus:border-zinc-500 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function formatSignal(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAge(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}
