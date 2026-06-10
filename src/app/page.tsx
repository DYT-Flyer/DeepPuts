"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Nav } from "@/components/nav";
import { ConvictionBadge } from "@/components/conviction-badge";
import { SignalBadge } from "@/components/signal-badge";
import { VoteButtons } from "@/components/social/vote-buttons";
import { RefreshCw, ArrowUpRight } from "lucide-react";
import type { SignalType } from "@/types";
import { formatCatalyst } from "@/lib/utils";

interface DashboardTopItem {
  id: string; convictionScore: number; signalType: string; bearThesis: string;
  affectedTickers: string[]; sector: string | null; catalystDate: string | null; createdAt: string; commentCount: number;
  voteScore: number; userVote: 1 | -1 | 0;
  event: { headline: string; publishedAt: string; assetClass: string; articleUrl: string | null };
}

interface DashboardStats {
  stats: { totalEvents: number; totalAnalyzed: number; highConviction: number; pendingAnalysis: number; events24h: number; analyzed24h: number; highConviction24h: number };
  lastRun: { status: string; startedAt: string; finishedAt: string | null; eventsFound: number; eventsAnalyzed: number; errorMessage: string | null } | null;
  recentTop: DashboardTopItem[];
  signalBreakdown: Array<{ type: string; count: number }>;
  assetBreakdown: Array<{ assetClass: string; count: number }>;
  trendingTickers: Array<{ ticker: string; count: number }>;
}

const STATUS_DOT: Record<string, string> = {
  success: "#22c55e", partial: "#f59e0b", error: "#f43f5e", running: "#3b82f6",
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/dashboard-stats").then(r => r.json()).then(d => { setData(d); setLastRefreshed(new Date()); }).finally(() => setLoading(false));
  }, []);

  async function triggerRefresh() {
    setRefreshing(true);
    await fetch("/api/cron", { method: "POST" });
    setTimeout(() => {
      fetch("/api/dashboard-stats").then(r => r.json()).then(d => { setData(d); setLastRefreshed(new Date()); }).finally(() => setRefreshing(false));
    }, 3000);
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = session?.user?.name?.split(" ")[0] || session?.user?.email?.split("@")[0] || "";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Nav userEmail={session?.user?.email} userName={session?.user?.name} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            {!loading && data && (
              <div className="flex items-center gap-2 flex-wrap">
                {data.stats.analyzed24h > 0 ? (
                  <span className="text-sm" style={{ color: "var(--text-2)" }}>
                    <span className="font-semibold" style={{ color: "var(--text)" }}>{data.stats.analyzed24h}</span> new event{data.stats.analyzed24h !== 1 ? "s" : ""} analyzed in last 24h
                  </span>
                ) : (
                  <span className="text-sm" style={{ color: "var(--text-3)" }}>No new events in the last 24h</span>
                )}
                {data.stats.highConviction24h > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "rgba(244,63,94,0.1)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.2)" }}>
                    {data.stats.highConviction24h} high conviction
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && !refreshing && (
              <span className="text-xs" style={{ color: "#444" }}>
                Updated {formatAge(lastRefreshed.toISOString())}
              </span>
            )}
            <button
              onClick={triggerRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-2)", cursor: refreshing ? "not-allowed" : "pointer", opacity: refreshing ? 0.5 : 1 }}
              onMouseEnter={e => { if (!refreshing) e.currentTarget.style.borderColor = "var(--border-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Main — Top Opportunities */}
          <div className="flex-1 min-w-0">
            <SectionHeader title="Top Opportunities" href="/opportunities" />
            <div className="space-y-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />
                ))
              ) : !data?.recentTop.length ? (
                <EmptyState message="No high-conviction opportunities yet" sub="Start the scheduler to begin" />
              ) : (
                data.recentTop.map((item) => (
                  <DashboardRow key={item.id} item={item} loggedIn={!!session} />
                ))
              )}
            </div>
            {data?.recentTop && data.recentTop.length > 0 && (
              <Link href="/opportunities" className="inline-flex items-center gap-1 mt-4 text-xs transition-colors"
                style={{ color: "var(--text-3)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
              >
                View all opportunities <ArrowUpRight size={11} />
              </Link>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-64 shrink-0 space-y-6">
            {/* Stats */}
            <div>
              <SectionHeader title="Stats" />
              <div className="space-y-2">
                {[
                  { label: "Events Ingested", value: data?.stats.totalEvents ?? 0, sub: "total" },
                  { label: "AI Analyzed", value: data?.stats.totalAnalyzed ?? 0, sub: "bear theses" },
                  { label: "High Conviction", value: data?.stats.highConviction ?? 0, sub: "score ≥ 7", highlight: true },
                  { label: "Pending", value: data?.stats.pendingAnalysis ?? 0, sub: "in queue" },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                    style={{ background: s.highlight ? "rgba(244,63,94,0.06)" : "var(--surface)", border: `1px solid ${s.highlight ? "rgba(244,63,94,0.2)" : "var(--border)"}` }}
                  >
                    <div>
                      <p className="text-xs font-medium" style={{ color: s.highlight ? "#f43f5e" : "var(--text-2)" }}>{s.label}</p>
                      <p className="text-xs" style={{ color: "var(--text-3)" }}>{s.sub}</p>
                    </div>
                    <p className="text-xl font-bold font-mono" style={{ color: s.highlight ? "#f43f5e" : "var(--text)" }}>
                      {loading ? "—" : s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Signal breakdown */}
            <div>
              <SectionHeader title="Signal Breakdown" />
              <div className="rounded-xl p-3 space-y-2.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-5 rounded animate-pulse" style={{ background: "var(--surface-2)" }} />
                  ))
                ) : !data?.signalBreakdown.length ? (
                  <p className="text-xs text-center py-2" style={{ color: "var(--text-3)" }}>No data yet</p>
                ) : (() => {
                  const total = data.signalBreakdown.reduce((s, b) => s + b.count, 0);
                  return data.signalBreakdown.map((b) => (
                    <div key={b.type} className="flex items-center gap-2">
                      <SignalBadge type={b.type as SignalType} size="sm" />
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                        <div className="h-full rounded-full" style={{ width: `${(b.count / total) * 100}%`, background: "rgba(255,255,255,0.15)" }} />
                      </div>
                      <span className="text-xs font-mono w-4 text-right" style={{ color: "var(--text-3)" }}>{b.count}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Scheduler */}
            <div>
              <SectionHeader title="Scheduler" />
              <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                {loading ? (
                  <div className="h-16 rounded animate-pulse" style={{ background: "var(--surface-2)" }} />
                ) : !data?.lastRun ? (
                  <div className="text-center py-3">
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>Never run</p>
                    <p className="text-xs mt-1 font-mono" style={{ color: "var(--text-3)" }}>npm run scheduler</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[
                      { label: "Status", value: data.lastRun.status, dot: STATUS_DOT[data.lastRun.status] },
                      { label: "Last run", value: formatAge(data.lastRun.startedAt) },
                      { label: "Found", value: String(data.lastRun.eventsFound) },
                      { label: "Analyzed", value: String(data.lastRun.eventsAnalyzed) },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: "var(--text-3)" }}>{row.label}</span>
                        <span className="text-xs flex items-center gap-1.5 font-mono capitalize" style={{ color: "var(--text-2)" }}>
                          {row.dot && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: row.dot, display: "inline-block" }} />}
                          {row.value}
                        </span>
                      </div>
                    ))}
                    {data.lastRun.errorMessage && (
                      <p className="text-xs rounded p-2 mt-1" style={{ background: "rgba(244,63,94,0.08)", color: "#f87171", border: "1px solid rgba(244,63,94,0.2)" }}>
                        {data.lastRun.errorMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Asset coverage */}
            {data?.assetBreakdown && data.assetBreakdown.length > 0 && (
              <div>
                <SectionHeader title="Coverage" />
                <div className="flex gap-2">
                  {data.assetBreakdown.map((a) => (
                    <div key={a.assetClass} className="flex-1 rounded-xl p-3 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <p className="text-2xl font-bold font-mono" style={{ color: "var(--text)" }}>{a.count}</p>
                      <p className="text-xs capitalize mt-0.5" style={{ color: "var(--text-3)" }}>{a.assetClass}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending tickers */}
            {data?.trendingTickers && data.trendingTickers.length > 0 && (
              <div>
                <SectionHeader title="Trending" />
                <div className="flex flex-wrap gap-1.5">
                  {data.trendingTickers.map(({ ticker, count }) => (
                    <Link key={ticker} href={`/ticker/${ticker}`}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "#aaa" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "#aaa"; }}
                    >
                      <span className="font-mono">{ticker}</span>
                      <span style={{ color: "#444", fontSize: "10px" }}>{count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function DashboardRow({ item, loggedIn }: { item: DashboardTopItem; loggedIn: boolean }) {
  const catalyst = item.catalystDate ? formatCatalyst(item.catalystDate) : null;

  return (
    <div
      className="rounded-xl px-4 py-4 transition-all"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-hover)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <div className="flex-1 min-w-0">
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "4px" }}>
          <ConvictionBadge score={item.convictionScore} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            {item.event.articleUrl ? (
              <a href={item.event.articleUrl} target="_blank" rel="noopener noreferrer"
                className="block text-sm font-medium leading-snug line-clamp-1 transition-colors"
                style={{ color: "#fff" }}
              >
                {item.event.headline}
              </a>
            ) : (
              <p className="text-sm font-medium leading-snug line-clamp-1" style={{ color: "#fff" }}>
                {item.event.headline}
              </p>
            )}
          </div>
        </div>
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-2)" }}>
          {item.bearThesis}
        </p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <SignalBadge type={item.signalType as SignalType} size="sm" />
          {catalyst && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: catalyst.urgent ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)",
                color: catalyst.urgent ? "#f59e0b" : "#666",
                border: `1px solid ${catalyst.urgent ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.08)"}`,
              }}
            >{catalyst.label}</span>
          )}
          {item.affectedTickers.slice(0, 4).map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span style={{ color: "#2a2a2a" }}>·</span>
              <Link href={`/ticker/${t}`} className="text-xs font-mono transition-colors"
                style={{ color: "#aaa" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
              >{t}</Link>
            </span>
          ))}
          <span style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <VoteButtons
              analysisId={item.id}
              initialScore={item.voteScore}
              initialUserVote={item.userVote}
              loggedIn={loggedIn}
            />
            <span style={{ color: "#555", lineHeight: 1, fontSize: "13px" }}>·</span>
            <Link href={`/opportunity/${item.id}`} className="text-xs transition-colors"
              style={{ color: "#aaa" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
            >
              {item.commentCount > 0 ? `${item.commentCount} Comment${item.commentCount !== 1 ? "s" : ""}` : "Comments"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: title === "Top Opportunities" ? "var(--text-2)" : "var(--text-3)" }}>{title}</h2>
      {href && (
        <Link href={href} className="text-xs flex items-center gap-1 transition-colors"
          style={{ color: "var(--text-2)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}
        >
          View all <ArrowUpRight size={10} />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="text-center py-12 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-sm" style={{ color: "var(--text-3)" }}>{message}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "#333" }}>{sub}</p>}
    </div>
  );
}

function formatAge(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}
