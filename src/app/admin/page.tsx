"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { RefreshCw, Play, Eye, Flag, Trash2, CheckCircle } from "lucide-react";

interface SchedulerRun {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  eventsFound: number;
  eventsAnalyzed: number;
  errorMessage: string | null;
  durationSec: number | null;
  claudeCost: number | null;
}

interface AdminData {
  runs: SchedulerRun[];
  stats: { 
    totalEvents: number; 
    totalAnalyzed: number; 
    pendingAnalysis: number;
    highConviction: number;
    events24h: number;
    analyzed24h: number;
    highConviction24h: number;
  };
  signalBreakdown: Array<{ type: string; count: number }>;
  assetBreakdown: Array<{ assetClass: string; count: number }>;
}

interface ModerationFlag {
  id: string;
  reason: string;
  createdAt: string;
  reporter: { name: string; email: string };
  comment: {
    id: string;
    content: string;
    analysisId: string;
    analysisSummary: string;
    author: { name: string; email: string };
  } | null;
}

const STATUS_DOT: Record<string, string> = {
  success: "#22c55e", partial: "#f59e0b", error: "#f43f5e", running: "#3b82f6",
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<"full" | "dry" | null>(null);
  const [triggerMsg, setTriggerMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"scheduler" | "moderation">("scheduler");
  const [flags, setFlags] = useState<ModerationFlag[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "admin") {
      router.replace("/");
    }
  }, [status, session, router]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/scheduler");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  async function loadFlags() {
    setFlagsLoading(true);
    const res = await fetch("/api/admin/moderation");
    if (res.ok) setFlags(await res.json());
    setFlagsLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === "moderation") loadFlags();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function moderateAction(action: "dismiss" | "delete_comment", flagId: string, commentId?: string) {
    await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, flagId, commentId }),
    });
    setFlags(prev => prev.filter(f => f.id !== flagId));
  }

  async function triggerRun(dryRun: boolean) {
    setTriggering(dryRun ? "dry" : "full");
    setTriggerMsg("");
    const res = await fetch("/api/admin/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dryRun }),
    });
    if (res.ok) {
      setTriggerMsg(dryRun ? "Dry run triggered." : "Full run triggered — refreshing in 5s…");
      if (!dryRun) setTimeout(() => load(), 5000);
    } else {
      setTriggerMsg("Failed to trigger run.");
    }
    setTriggering(null);
  }

  if (status === "loading" || status === "unauthenticated") return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Nav userEmail={session?.user?.email} userName={session?.user?.name} />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>Admin</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Scheduler controls and system health</p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-3)", cursor: loading ? "not-allowed" : "pointer" }}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8">
          {(["scheduler", "moderation"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="text-xs px-4 py-1.5 rounded-lg capitalize transition-all"
              style={{
                background: activeTab === t ? "rgba(255,255,255,0.08)" : "transparent",
                color: activeTab === t ? "var(--text)" : "var(--text-3)",
                border: `1px solid ${activeTab === t ? "var(--border-hover)" : "transparent"}`,
              }}
            >
              {t}
              {t === "moderation" && flags.length > 0 && (
                <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-mono"
                  style={{ background: "rgba(244,63,94,0.2)", color: "#f43f5e" }}>
                  {flags.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "moderation" ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                Flagged Comments
              </h2>
              <button onClick={loadFlags} className="text-xs flex items-center gap-1.5 transition-colors"
                style={{ color: "var(--text-3)", background: "none", border: "none", cursor: "pointer" }}
              >
                <RefreshCw size={11} className={flagsLoading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>

            {flagsLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />)}
              </div>
            ) : flags.length === 0 ? (
              <div className="rounded-xl py-16 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <CheckCircle size={24} style={{ color: "#22c55e", margin: "0 auto 12px" }} />
                <p className="text-sm" style={{ color: "var(--text-3)" }}>No pending flags</p>
              </div>
            ) : (
              <div className="space-y-3">
                {flags.map(f => (
                  <div key={f.id} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Flag size={12} style={{ color: "#f59e0b", flexShrink: 0 }} />
                        <span className="text-xs font-medium capitalize" style={{ color: "#f59e0b" }}>{f.reason}</span>
                        <span className="text-xs" style={{ color: "var(--text-3)" }}>·</span>
                        <span className="text-xs" style={{ color: "var(--text-3)" }}>
                          by {f.reporter.name} · {new Date(f.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => moderateAction("dismiss", f.id)}
                          className="text-xs px-2.5 py-1 rounded-lg transition-all"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-3)", cursor: "pointer" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#22c55e")}
                          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                          title="Dismiss (keep comment)"
                        >Dismiss</button>
                        {f.comment && (
                          <button onClick={() => moderateAction("delete_comment", f.id, f.comment!.id)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all"
                            style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "#f43f5e", cursor: "pointer" }}
                          >
                            <Trash2 size={10} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                    {f.comment && (
                      <>
                        <p className="text-xs mb-2 px-3 py-2 rounded-lg italic" style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
                          &ldquo;{f.comment.content}&rdquo;
                        </p>
                        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-3)" }}>
                          <span>by {f.comment.author.name}</span>
                          <span>·</span>
                          <Link href={`/opportunity/${f.comment.analysisId}`} target="_blank"
                            className="transition-colors" style={{ color: "#555" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#aaa")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#555")}
                          >
                            {f.comment.analysisSummary}
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-3)" }}>Stats</h2>
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
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-3)" }}>Signal Breakdown</h2>
            <div className="rounded-xl p-3 space-y-2.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-5 rounded animate-pulse" style={{ background: "var(--surface-2)" }} />
                ))
              ) : !data?.signalBreakdown?.length ? (
                <p className="text-xs text-center py-2" style={{ color: "var(--text-3)" }}>No data yet</p>
              ) : (() => {
                const total = data.signalBreakdown.reduce((s, b) => s + b.count, 0);
                return data.signalBreakdown.map((b) => (
                  <div key={b.type} className="flex items-center gap-2">
                    <div className="w-20 truncate">
                      <span className="text-xs font-medium capitalize" style={{ color: "var(--text-2)" }}>{b.type.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(b.count / total) * 100}%`, background: "rgba(255,255,255,0.15)" }} />
                    </div>
                    <span className="text-xs font-mono w-4 text-right" style={{ color: "var(--text-3)" }}>{b.count}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Trigger */}
        <div className="rounded-xl p-5 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-3)" }}>Scheduler Controls</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => triggerRun(false)} disabled={triggering !== null}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                background: triggering ? "rgba(244,63,94,0.2)" : "#f43f5e",
                color: triggering ? "rgba(255,255,255,0.4)" : "#fff",
                border: "none", cursor: triggering ? "not-allowed" : "pointer",
              }}
            >
              <Play size={12} />
              {triggering === "full" ? "Triggering…" : "Run Full Ingest"}
            </button>
            <button onClick={() => triggerRun(true)} disabled={triggering !== null}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)", cursor: triggering ? "not-allowed" : "pointer" }}
              onMouseEnter={e => { if (!triggering) e.currentTarget.style.borderColor = "var(--border-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <Eye size={12} />
              {triggering === "dry" ? "Running…" : "Dry Run"}
            </button>
            {triggerMsg && (
              <p className="text-xs" style={{ color: "var(--text-3)" }}>{triggerMsg}</p>
            )}
          </div>
          <p className="text-xs mt-3" style={{ color: "var(--text-3)" }}>
            Full run fetches events from Polygon.io and runs Claude on unanalyzed events.
            Dry run simulates without writing to the database.
          </p>
        </div>

        {/* Asset Coverage */}
        <div className="rounded-xl p-5 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-3)" }}>Asset Coverage</h2>
          {!data?.assetBreakdown?.length ? (
            <p className="text-xs text-center py-2" style={{ color: "var(--text-3)" }}>No asset coverage data yet</p>
          ) : (
            <div className="flex gap-4">
              {data.assetBreakdown.map((a) => (
                <div key={a.assetClass} className="flex-1 rounded-xl p-4 text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <p className="text-3xl font-bold font-mono" style={{ color: "var(--text)" }}>{a.count}</p>
                  <p className="text-sm capitalize mt-1" style={{ color: "var(--text-3)" }}>{a.assetClass}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Run history */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Run History</h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-8 rounded animate-pulse" style={{ background: "var(--surface)" }} />)}
            </div>
          ) : !data?.runs.length ? (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: "var(--text-3)" }}>No runs yet</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Status", "Started", "Duration", "Found", "Analyzed", "Cost", "Error"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-medium" style={{ color: "var(--text-3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.runs.map((run, i) => (
                  <tr key={run.id} style={{ borderBottom: i < data.runs.length - 1 ? "1px solid var(--border)" : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 capitalize font-medium" style={{ color: STATUS_DOT[run.status] ?? "var(--text-2)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_DOT[run.status] ?? "#555", display: "inline-block" }} />
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "var(--text-2)" }}>
                      {new Date(run.startedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "var(--text-3)" }}>
                      {run.durationSec !== null ? `${run.durationSec}s` : run.status === "running" ? "running…" : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "var(--text-2)" }}>{run.eventsFound}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: "var(--text-2)" }}>{run.eventsAnalyzed}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-3)" }}>
                      {run.claudeCost !== null ? `$${run.claudeCost.toFixed(4)}` : "—"}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate" style={{ color: "#f87171" }}>
                      {run.errorMessage ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
          </>
        )}
      </main>
    </div>
  );
}
