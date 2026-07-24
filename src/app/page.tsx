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
import { formatCatalyst, getDomain } from "@/lib/utils";
import "./trending.css";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const loadData = () => {
      fetch("/api/dashboard-stats").then(r => r.json()).then(d => { setData(d); }).finally(() => setLoading(false));
    };
    loadData();
    const interval = setInterval(loadData, 30000); // Auto-update every 30s
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }} suppressHydrationWarning>
      <Nav userEmail={session?.user?.email} userName={session?.user?.name} />

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Trending tickers */}
        {data?.trendingTickers && data.trendingTickers.length > 0 && (
          <div className="mb-8 trending-section">
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3 trending-title" style={{ color: "var(--text-3)" }}>Trending</h2>
            <div className="trending-container">
              {data.trendingTickers.map(({ ticker, count }) => (
                <Link key={ticker} href={`/ticker/${ticker}`} className="trending-tag">
                  <span className="trending-ticker">{ticker}</span>
                  <span className="trending-count">{count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
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
          <div className="w-0 shrink-0 space-y-6 hidden lg:block">
            {/* Since trending was moved to the top, the sidebar is now empty for now. 
                We keep the layout structure in case we add more widgets later, 
                but collapse it with w-0. */}
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-12 text-center pb-8">
          <Link href="/admin" className="text-xs transition-colors"
            style={{ color: "var(--text-3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
          >
            Admin Console
          </Link>
        </div>
      </main>
    </div>
  );
}

import { useRouter } from "next/navigation";

function DashboardRow({ item, loggedIn }: { item: DashboardTopItem; loggedIn: boolean }) {
  const router = useRouter();
  const catalyst = item.catalystDate ? formatCatalyst(item.catalystDate) : null;

  return (
    <div
      onClick={() => router.push(`/opportunity/${item.id}#comments`)}
      className="rounded-xl px-4 py-4 transition-all cursor-pointer"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-hover)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <div className="flex-1 min-w-0">
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "4px" }}>
          <ConvictionBadge score={item.convictionScore} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 min-w-0 truncate leading-snug">
                {item.event.articleUrl ? (
                  <>
                    <a href={item.event.articleUrl} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium transition-colors hover:underline"
                      style={{ color: "#fff" }}
                    >
                      {item.event.headline}
                    </a>
                    {getDomain(item.event.articleUrl) && (
                      <>
                        {" "}
                        <span className="text-xs font-normal whitespace-nowrap" style={{ color: "var(--text-3)" }}>
                          {getDomain(item.event.articleUrl)}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-sm font-medium" style={{ color: "#fff" }}>
                    {item.event.headline}
                  </span>
                )}
              </div>
              <span className="shrink-0 text-xs whitespace-nowrap text-right" style={{ color: "var(--text-3)" }}>
                {formatAge(item.event.publishedAt)}
              </span>
            </div>
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
            <span key={t} className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <span style={{ color: "#2a2a2a" }}>·</span>
              <Link href={`/ticker/${t}`} className="text-xs font-mono transition-colors"
                style={{ color: "#aaa" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
              >{t}</Link>
            </span>
          ))}
          <span style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
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
