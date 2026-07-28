"use client";

import { useEffect, useState } from "react";
import type { TickerPerformance } from "@/app/api/opportunity/[id]/performance/route";

export function CardPerformance({ 
  opportunityId,
  tickers,
  pubDate,
  assetClass
}: { 
  opportunityId?: string,
  tickers?: string[],
  pubDate?: string,
  assetClass?: string
}) {
  const [perf, setPerf] = useState<TickerPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPerf() {
      if (!opportunityId && (!tickers || tickers.length === 0 || !pubDate)) {
        setLoading(false);
        return;
      }
      try {
        const url = opportunityId 
          ? `/api/opportunity/${opportunityId}/performance`
          : `/api/performance?tickers=${tickers!.join(",")}&pubDate=${encodeURIComponent(pubDate!)}${assetClass ? `&assetClass=${assetClass}` : ""}`;
        
        const res = await fetch(url);
        if (res.ok) {
          const data: TickerPerformance[] = await res.json();
          if (data && data.length > 0) {
            setPerf(data[0]); // show first ticker on card
          }
        }
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchPerf();
  }, [opportunityId, tickers?.join(","), pubDate, assetClass]);

  if (loading) {
    return (
      <div className="h-4 w-24 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
    );
  }

  if (!perf || perf.pubPrice === null || perf.priceCurrent === null) {
    return null; // Don't show if missing data
  }

  const pct = perf.pctCurrent !== null ? perf.pctCurrent : 0;
  const isDown = pct < 0;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span style={{ color: "#444", fontSize: "14px" }}>·</span>
      <span className="text-xs font-mono" style={{ color: "var(--text-3)" }}>
        ${perf.pubPrice.toFixed(2)}
      </span>
      <span style={{ color: "var(--text-3)", fontSize: "11px" }}>→</span>
      <span className="text-xs font-mono font-medium" style={{ color: "var(--text)" }}>
        ${perf.priceCurrent.toFixed(2)}
      </span>
      <span className="text-xs font-mono font-semibold" style={{ color: isDown ? "#34d399" : "#f43f5e" }}>
        {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
      </span>
    </div>
  );
}
