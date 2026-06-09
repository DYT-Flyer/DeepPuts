"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Nav } from "@/components/nav";
import { ConvictionBadge } from "@/components/conviction-badge";
import { SignalBadge } from "@/components/signal-badge";
import type { SignalType } from "@/types";

interface DashboardStats {
  stats: {
    totalEvents: number;
    totalAnalyzed: number;
    highConviction: number;
    pendingAnalysis: number;
  };
  lastRun: {
    status: string;
    startedAt: string;
    finishedAt: string | null;
    eventsFound: number;
    eventsAnalyzed: number;
    errorMessage: string | null;
  } | null;
  recentTop: Array<{
    id: string;
    convictionScore: number;
    signalType: string;
    bearThesis: string;
    affectedTickers: string[];
    sector: string | null;
    createdAt: string;
    event: {
      headline: string;
      publishedAt: string;
      assetClass: string;
      articleUrl: string | null;
    };
  }>;
  signalBreakdown: Array<{ type: string; count: number }>;
  assetBreakdown: Array<{ assetClass: string; count: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  success: "text-green-400",
  partial: "text-yellow-400",
  error: "text-red-400",
  running: "text-blue-400",
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard-stats")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  async function triggerRefresh() {
    setRefreshing(true);
    await fetch("/api/cron", { method: "POST" });
    setTimeout(() => {
      fetch("/api/dashboard-stats")
        .then((r) => r.json())
        .then(setData)
        .finally(() => setRefreshing(false));
    }, 3000);
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = session?.user?.name?.split(" ")[0] || session?.user?.email?.split("@")[0] || "";

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav userEmail={session?.user?.email} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Greeting */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">
              {greeting}{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
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

        <div className="flex gap-6">
          {/* Main — Top Opportunities */}
          <div className="flex-1 min-w-0">
            <SectionHeader title="Top Opportunities" href="/opportunities" />
            <div className="space-y-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 bg-zinc-900 rounded-lg border border-zinc-800 animate-pulse" />
                ))
              ) : !data?.recentTop.length ? (
                <EmptyState message="No high-conviction opportunities yet" />
              ) : (
                data.recentTop.map((item) => (
                  <div
                    key={item.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <ConvictionBadge score={item.convictionScore} />
                      <div className="flex-1 min-w-0">
                        {item.event.articleUrl ? (
                          <a
                            href={item.event.articleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm text-zinc-200 leading-snug line-clamp-1 mb-1 hover:text-zinc-100 hover:underline transition-colors"
                          >
                            {item.event.headline}
                          </a>
                        ) : (
                          <p className="text-sm text-zinc-200 leading-snug line-clamp-1 mb-1">
                            {item.event.headline}
                          </p>
                        )}
                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                          {item.bearThesis}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <SignalBadge type={item.signalType as SignalType} size="sm" />
                          {item.affectedTickers.slice(0, 4).map((t) => (
                            <span key={t} className="flex items-center gap-2">
                              <span className="text-zinc-700">·</span>
                              <Link
                                href={`/ticker/${t}`}
                                className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                              >
                                {t}
                              </Link>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {data?.recentTop && data.recentTop.length > 0 && (
              <Link
                href="/opportunities"
                className="inline-block mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                View all opportunities →
              </Link>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-72 flex-shrink-0 space-y-5">
            {/* Stat cards */}
            <div>
              <SectionHeader title="Stats" />
              <div className="space-y-2">
                <StatCard
                  label="Events Ingested"
                  value={loading ? "—" : String(data?.stats.totalEvents ?? 0)}
                  sub="total tracked"
                />
                <StatCard
                  label="AI Analyzed"
                  value={loading ? "—" : String(data?.stats.totalAnalyzed ?? 0)}
                  sub="bear theses generated"
                />
                <StatCard
                  label="High Conviction"
                  value={loading ? "—" : String(data?.stats.highConviction ?? 0)}
                  sub="score ≥ 7"
                  highlight
                />
                <StatCard
                  label="Pending Analysis"
                  value={loading ? "—" : String(data?.stats.pendingAnalysis ?? 0)}
                  sub="queued for Claude"
                />
              </div>
            </div>

            {/* Signal breakdown */}
            <div>
              <SectionHeader title="Signal Breakdown" />
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-6 bg-zinc-800 rounded animate-pulse" />
                  ))
                ) : !data?.signalBreakdown.length ? (
                  <EmptyState message="No data yet" />
                ) : (
                  (() => {
                    const total = data.signalBreakdown.reduce((s, b) => s + b.count, 0);
                    return data.signalBreakdown.map((b) => (
                      <div key={b.type} className="flex items-center gap-2">
                        <SignalBadge type={b.type as SignalType} size="sm" />
                        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-600 rounded-full"
                            style={{ width: `${(b.count / total) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 font-mono w-5 text-right">{b.count}</span>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>

            {/* Scheduler status */}
            <div>
              <SectionHeader title="Scheduler" />
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                {loading ? (
                  <div className="h-20 bg-zinc-800 rounded animate-pulse" />
                ) : !data?.lastRun ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-zinc-500">Scheduler has never run</p>
                    <p className="text-xs text-zinc-600 mt-1">
                      Start with: <code className="font-mono">npm run scheduler</code>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Status</span>
                      <span className={`text-xs font-medium capitalize ${STATUS_COLORS[data.lastRun.status] || "text-zinc-400"}`}>
                        {data.lastRun.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Last run</span>
                      <span className="text-xs text-zinc-400">{formatAge(data.lastRun.startedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Events found</span>
                      <span className="text-xs text-zinc-400 font-mono">{data.lastRun.eventsFound}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Analyzed</span>
                      <span className="text-xs text-zinc-400 font-mono">{data.lastRun.eventsAnalyzed}</span>
                    </div>
                    {data.lastRun.errorMessage && (
                      <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1 mt-1">
                        {data.lastRun.errorMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Asset breakdown */}
            {data?.assetBreakdown && data.assetBreakdown.length > 0 && (
              <div>
                <SectionHeader title="Asset Coverage" />
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex gap-4">
                  {data.assetBreakdown.map((a) => (
                    <div key={a.assetClass} className="flex-1 text-center">
                      <p className="text-2xl font-bold font-mono text-zinc-200">{a.count}</p>
                      <p className="text-xs text-zinc-500 capitalize mt-0.5">{a.assetClass}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div>
              <SectionHeader title="Quick Links" />
              <div className="grid grid-cols-2 gap-2">
                <QuickLink href="/opportunities" label="Opportunity Board" />
                <QuickLink href="/events" label="Event Feed" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 flex items-center justify-between ${highlight ? "bg-red-500/5 border-red-500/20" : "bg-zinc-900 border-zinc-800"}`}>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-xs text-zinc-600">{sub}</p>
      </div>
      <p className={`text-2xl font-bold font-mono ${highlight ? "text-red-400" : "text-zinc-100"}`}>{value}</p>
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</h2>
      {href && (
        <Link href={href} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          View all
        </Link>
      )}
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors text-center"
    >
      {label}
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-6">
      <p className="text-xs text-zinc-600">{message}</p>
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
