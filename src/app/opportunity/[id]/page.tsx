"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { Nav } from "@/components/nav";
import { ConvictionBadge } from "@/components/conviction-badge";
import { SignalBadge } from "@/components/signal-badge";
import { VoteButtons } from "@/components/social/vote-buttons";
import { OpportunityCard } from "@/components/opportunity-card";
import { STATUS_LABELS, type ThesisStatus } from "@/lib/performance/calculator";
import type { OpportunityItem, SignalType } from "@/types";
import { getDomain } from "@/lib/utils";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
  replies: Comment[];
}

interface OpportunityDetail {
  id: string;
  bearThesis: string;
  convictionScore: number;
  signalType: string;
  affectedTickers: string[];
  sector: string | null;
  industry: string | null;
  catalystDate: string | null;
  createdAt: string;
  voteScore: number;
  userVote: 1 | -1 | 0;
  keyRisks: string[] | null;
  counterArgs: string[] | null;
  confidenceLabel: string | null;
  timeHorizon: string | null;
  severity: string | null;
  sourceQuality: string | null;
  promptVersion: string | null;
  modelName: string | null;
  event: {
    headline: string;
    summary: string | null;
    publishedAt: string;
    assetClass: string;
    source: string;
    articleUrl: string | null;
  };
  comments: Comment[];
}

export default function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();

  const [data, setData] = useState<OpportunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [related, setRelated] = useState<OpportunityItem[]>([]);
  const [commentSort, setCommentSort] = useState<"newest" | "oldest">("newest");

  const [perf, setPerf] = useState<Array<{
    ticker: string;
    pubPrice: number | null;
    price1d: number | null; price5d: number | null; price30d: number | null; priceCurrent: number | null;
    pct1d: number | null; pct5d: number | null; pct30d: number | null; pctCurrent: number | null;
    status: ThesisStatus;
  }>>([]);
  const [perfLoading, setPerfLoading] = useState(true);
  const [perfTab, setPerfTab] = useState<"current" | "30d" | "5d" | "1d">("current");

  useEffect(() => {
    fetch(`/api/opportunity/${id}`)
      .then(r => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then(d => {
        if (d) {
          setData(d);
          Promise.all([
            fetch(`/api/opportunity/${id}/performance`).then(r => r.ok ? r.json() : []).catch(() => []),
            d.sector
              ? fetch(`/api/opportunity/related?sector=${encodeURIComponent(d.sector)}&exclude=${id}&limit=4`).then(r => r.ok ? r.json() : []).catch(() => [])
              : Promise.resolve([]),
          ]).then(([perfData, relatedData]) => {
            setPerf(perfData ?? []);
            setRelated(relatedData ?? []);
          }).finally(() => setPerfLoading(false));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId: id, content: text }),
    });
    if (res.ok) {
      const c = await res.json();
      setData(prev => prev ? { ...prev, comments: [...prev.comments, c] } : prev);
      setText("");
    } else {
      const d = await res.json();
      setError(d.error || "Failed to post comment");
    }
    setSubmitting(false);
  }

  async function deleteComment(commentId: string) {
    await fetch(`/api/comments?id=${commentId}`, { method: "DELETE" });
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        comments: prev.comments
          .filter(c => c.id !== commentId)
          .map(c => ({
            ...c,
            replies: c.replies
              .filter(r => r.id !== commentId)
              .map(r => ({ ...r, replies: r.replies.filter(rr => rr.id !== commentId) })),
          })),
      };
    });
  }

  function formatAge(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return "just now";
  }

  function displayName(user: Comment["user"]) {
    return user.name || user.email.split("@")[0];
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Nav userEmail={session?.user?.email} userName={session?.user?.name} />

      <main className="max-w-3xl mx-auto px-6 py-8">

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "var(--surface)" }} />)}
          </div>
        ) : notFound ? (
          <div className="rounded-xl py-16 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>This opportunity could not be found.</p>
            <Link href="/opportunities" className="text-xs mt-3 inline-block transition-colors" style={{ color: "#f43f5e" }}>
              Back to Opportunities
            </Link>
          </div>
        ) : !data ? null : (
          <div className="space-y-6">
            {/* Main card */}
            <div className="rounded-xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              {/* Score + headline */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
                <ConvictionBadge score={data.convictionScore} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {data.event.articleUrl ? (
                    <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
                      <a href={data.event.articleUrl} target="_blank" rel="noopener noreferrer"
                        className="text-base font-semibold leading-snug transition-colors hover:underline inline"
                        style={{ color: "#fff" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#ddd")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#fff")}
                      >
                        {data.event.headline}
                      </a>
                      {getDomain(data.event.articleUrl) && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-normal" style={{ color: "var(--text-3)" }}>
                            {getDomain(data.event.articleUrl)}
                          </span>
                          <ExternalLink size={13} style={{ flexShrink: 0, color: "#555" }} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-base font-semibold leading-snug" style={{ color: "#fff" }}>{data.event.headline}</p>
                  )}
                  <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                    {formatAge(data.event.publishedAt)} · {data.event.source}
                  </p>
                </div>
              </div>

              {/* AI disclaimer */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#555", border: "1px solid rgba(255,255,255,0.07)" }}>
                  AI-generated
                </span>
                {data.confidenceLabel && (
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{ background: "rgba(255,255,255,0.04)", color: "#555", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {data.confidenceLabel} confidence
                  </span>
                )}
                {data.timeHorizon && (
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{ background: "rgba(255,255,255,0.04)", color: "#555", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {data.timeHorizon}
                  </span>
                )}
                {data.sourceQuality && (
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{ background: "rgba(255,255,255,0.04)", color: "#555", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {data.sourceQuality} source
                  </span>
                )}
                <span className="text-xs" style={{ color: "#333" }}>· Not investment advice</span>
              </div>

              {/* Bear thesis */}
              <div className="rounded-lg p-4 mb-4" style={{ background: "rgba(244,63,94,0.04)", border: "1px solid rgba(244,63,94,0.12)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#f43f5e" }}>Bear Thesis</p>
                <p className="text-sm leading-relaxed" style={{ color: "#fff" }}>{data.bearThesis}</p>
              </div>

              {/* Key risks */}
              {data.keyRisks && data.keyRisks.length > 0 && (
                <div className="rounded-lg p-4 mb-4" style={{ background: "rgba(244,63,94,0.02)", border: "1px solid rgba(244,63,94,0.08)" }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: "#f43f5e" }}>Key Risks</p>
                  <ul className="space-y-1.5">
                    {data.keyRisks.map((risk, i) => (
                      <li key={i} className="text-sm leading-snug flex gap-2" style={{ color: "#fff" }}>
                        <span style={{ color: "#f43f5e", opacity: 1, flexShrink: 0, marginTop: "1px" }}>▸</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary */}
              {data.event.summary && (
                <p className="text-sm leading-relaxed mb-4" style={{ color: "#d4d4d4" }}>{data.event.summary}</p>
              )}

              {/* Tags + Vote */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <SignalBadge type={data.signalType as SignalType} />
                {data.sector && (
                  <Link href={`/sector/${encodeURIComponent(data.sector.toLowerCase())}`}
                    className="text-xs px-2 py-0.5 rounded-full transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#aaa", border: "1px solid rgba(255,255,255,0.1)" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#ddd"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#aaa"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  >
                    {data.sector}
                  </Link>
                )}
                {data.affectedTickers.length > 0 && <span style={{ color: "#444" }}>·</span>}
                {data.affectedTickers.map((ticker, i) => (
                  <span key={ticker} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    {i > 0 && <span style={{ color: "#444" }}>·</span>}
                    <Link href={`/ticker/${ticker}`}
                      className="text-xs font-mono px-2 py-0.5 rounded transition-colors"
                      style={{ background: "rgba(255,255,255,0.04)", color: "#888", border: "1px solid var(--border)" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#ddd"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#888"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    >
                      {ticker}
                    </Link>
                  </span>
                ))}
                <span style={{ flex: 1 }} />
                <VoteButtons
                  analysisId={data.id}
                  initialScore={data.voteScore}
                  initialUserVote={data.userVote}
                  loggedIn={!!session}
                  size="md"
                />
              </div>

              {/* AI metadata footer */}
              {(data.modelName || data.promptVersion) && (
                <p className="text-xs mt-4 pt-3" style={{ borderTop: "1px solid var(--border)", color: "#2a2a2a" }}>
                  {[data.modelName, data.promptVersion && `prompt ${data.promptVersion}`].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            {/* Counterarguments */}
            {data.counterArgs && data.counterArgs.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: "#34d399" }}>Bull Case / Counterarguments</p>
                <ul className="space-y-1.5">
                  {data.counterArgs.map((arg, i) => (
                    <li key={i} className="text-sm leading-snug flex gap-2" style={{ color: "#fff" }}>
                      <span style={{ color: "#34d399", opacity: 1, flexShrink: 0, marginTop: "1px" }}>▸</span>
                      {arg}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Performance */}
            <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Price Performance</h2>
                {/* Horizon tabs */}
                {!perfLoading && perf.length > 0 && (
                  <div style={{ display: "flex", gap: "2px" }}>
                    {(["current", "30d", "5d", "1d"] as const).map(tab => (
                      <button key={tab} onClick={() => setPerfTab(tab)}
                        className="text-xs px-2 py-0.5 rounded transition-all"
                        style={{
                          background: perfTab === tab ? "rgba(255,255,255,0.1)" : "transparent",
                          border: `1px solid ${perfTab === tab ? "rgba(255,255,255,0.15)" : "transparent"}`,
                          color: perfTab === tab ? "var(--text-2)" : "var(--text-3)",
                          cursor: "pointer",
                        }}
                      >
                        {tab === "current" ? "Now" : tab.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {perfLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-6 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}
                </div>
              ) : perf.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-3)" }}>No price data available.</p>
              ) : (
                <>
                  {/* Overall thesis status */}
                  {(() => {
                    const statuses = perf.map(p => p.status);
                    const dominant = statuses[0];
                    const s = STATUS_LABELS[dominant];
                    return (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Thesis</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })()}

                  <div className="space-y-2">
                    {perf.map((p) => {
                      const pctChange = perfTab === "1d" ? p.pct1d
                        : perfTab === "5d" ? p.pct5d
                        : perfTab === "30d" ? p.pct30d
                        : p.pctCurrent;
                      const currentPrice = perfTab === "1d" ? p.price1d
                        : perfTab === "5d" ? p.price5d
                        : perfTab === "30d" ? p.price30d
                        : p.priceCurrent;
                      const statusInfo = STATUS_LABELS[p.status];

                      return (
                        <div key={p.ticker} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <Link href={`/ticker/${p.ticker}`}
                            className="text-xs font-mono font-semibold transition-colors"
                            style={{ color: "#aaa", minWidth: "52px" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
                          >{p.ticker}</Link>
                          <span className="text-xs font-mono" style={{ color: "var(--text-3)" }}>
                            {p.pubPrice !== null ? `$${p.pubPrice.toFixed(2)}` : "—"}
                          </span>
                          <span style={{ color: "var(--text-3)", fontSize: "11px" }}>→</span>
                          <span className="text-xs font-mono" style={{ color: "var(--text-2)" }}>
                            {currentPrice !== null ? `$${currentPrice.toFixed(2)}` : "—"}
                          </span>
                          {pctChange !== null ? (
                            <span className="text-xs font-mono font-semibold" style={{ color: pctChange < 0 ? "#34d399" : "#f43f5e" }}>
                              {pctChange > 0 ? "+" : ""}{pctChange.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs font-mono" style={{ color: "var(--text-3)" }}>—</span>
                          )}
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: statusInfo.bg, color: statusInfo.color, fontSize: "10px" }}>
                            {statusInfo.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs mt-3" style={{ color: "#555" }}>
                    Bear confirmed = price ↓ (green) &nbsp;·&nbsp; Bear wrong = price ↑ (red)
                  </p>
                </>
              )}
            </div>

            {/* Comments */}
            <div id="comments">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                    Discussion
                  </h2>
                  <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "var(--surface)", color: "var(--text-3)", border: "1px solid var(--border)" }}>
                    {data.comments.length}
                  </span>
                </div>
                {data.comments.length > 1 && (
                  <div className="flex items-center gap-1">
                    {(["newest", "oldest"] as const).map(s => (
                      <button key={s} onClick={() => setCommentSort(s)}
                        className="text-xs px-2 py-1 rounded transition-all capitalize"
                        style={{
                          background: commentSort === s ? "rgba(255,255,255,0.08)" : "transparent",
                          color: commentSort === s ? "var(--text-2)" : "var(--text-3)",
                          border: `1px solid ${commentSort === s ? "var(--border-hover)" : "transparent"}`,
                        }}
                      >{s}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Comment form */}
              {session ? (
                <form onSubmit={submitComment} className="mb-6 rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1"
                      style={{ background: "rgba(244,63,94,0.15)", color: "#f43f5e" }}>
                      {(session.user?.name || session.user?.email || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Share your thoughts on this opportunity…"
                        maxLength={1000}
                        rows={3}
                        className="w-full text-sm px-3 py-2.5 rounded-lg resize-none"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                        onFocus={e => (e.target.style.borderColor = "rgba(244,63,94,0.4)")}
                        onBlur={e => (e.target.style.borderColor = "var(--border)")}
                      />
                      {error && <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>{error}</p>}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
                        <span className="text-xs" style={{ color: "var(--text-3)" }}>{text.length}/1000</span>
                        <button type="submit" disabled={submitting || !text.trim()}
                          className="text-sm px-4 py-1.5 rounded-lg transition-all font-medium"
                          style={{
                            background: submitting || !text.trim() ? "rgba(244,63,94,0.2)" : "#f43f5e",
                            color: submitting || !text.trim() ? "rgba(255,255,255,0.4)" : "#fff",
                            cursor: submitting || !text.trim() ? "not-allowed" : "pointer",
                          }}
                        >
                          {submitting ? "Posting…" : "Post"}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="rounded-xl px-6 py-8 mb-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p className="text-sm mb-3" style={{ color: "var(--text-2)" }}>Join the discussion</p>
                  <Link href="/login"
                    className="inline-block text-sm px-5 py-2 rounded-lg font-medium transition-all"
                    style={{ background: "#f43f5e", color: "#fff" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fb4f6b")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#f43f5e")}
                  >
                    Sign in to comment
                  </Link>
                  <p className="text-xs mt-3" style={{ color: "var(--text-3)" }}>
                    Don&apos;t have an account? <Link href="/login" style={{ color: "#f43f5e" }}>Sign up free</Link>
                  </p>
                </div>
              )}

              {/* Comment list */}
              {data.comments.length === 0 ? (
                <div className="rounded-xl py-10 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--text-3)" }}>No comments yet.</p>
                  <p className="text-xs mt-1" style={{ color: "#444" }}>Be the first to share your take.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {[...data.comments].sort((a, b) => {
                    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    return commentSort === "newest" ? -diff : diff;
                  }).map(c => (
                    <CommentThread
                      key={c.id}
                      comment={c}
                      session={session}
                      analysisId={id}
                      onDelete={deleteComment}
                      onReply={(rootId, parentId, newComment) => {
                        setData(prev => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            comments: prev.comments.map(top =>
                              top.id === rootId
                                ? {
                                    ...top,
                                    replies: parentId === rootId
                                      ? [...top.replies, newComment]
                                      : top.replies.map(r =>
                                          r.id === parentId
                                            ? { ...r, replies: [...r.replies, newComment] }
                                            : r
                                        ),
                                  }
                                : top
                            ),
                          };
                        });
                      }}
                      formatAge={formatAge}
                      displayName={displayName}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* Related theses */}
            {related.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                    Related in {data.sector}
                  </h2>
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {related.map(item => <OpportunityCard key={item.id} item={item} loggedIn={!!session} />)}
                </div>
                {data.sector && (
                  <Link href={`/sector/${encodeURIComponent(data.sector.toLowerCase())}`}
                    className="inline-flex items-center gap-1.5 mt-3 text-xs transition-colors"
                    style={{ color: "var(--text-3)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                  >
                    View all {data.sector} theses <ArrowLeft size={10} style={{ transform: "rotate(180deg)" }} />
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function CommentThread({
  comment, session, analysisId, onDelete, onReply, formatAge, displayName,
}: {
  comment: Comment;
  session: { user?: { id?: string; name?: string | null; email?: string | null } } | null;
  analysisId: string;
  onDelete: (id: string) => void;
  onReply: (rootId: string, parentId: string, reply: Comment) => void;
  formatAge: (iso: string) => string;
  displayName: (user: Comment["user"]) => string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openReply(targetName: string, targetId?: string) {
    setReplyingTo({ id: targetId || comment.id, name: targetName });
    setReplyText(`@${targetName} `);
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !replyingTo) return;
    setSubmitting(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId, content: replyText, parentId: replyingTo.id }),
    });
    if (res.ok) {
      const c = await res.json();
      onReply(comment.id, replyingTo.id, c);
      setReplyText("");
      setReplyingTo(null);
    }
    setSubmitting(false);
  }

  return (
    <div style={{ display: "flex", gap: "0" }}>
      {/* Collapse line */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "28px", flexShrink: 0 }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: "rgba(244,63,94,0.12)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.15)" }}>
          {displayName(comment.user)[0].toUpperCase()}
        </div>
        {!collapsed && (comment.replies.length > 0 || replyingTo) && (
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse thread"
            style={{ width: "2px", flex: 1, marginTop: "6px", background: "var(--border)", border: "none", cursor: "pointer", padding: 0, minHeight: "20px" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f43f5e")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--border)")}
          />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, paddingLeft: "10px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{displayName(comment.user)}</span>
          <span className="text-xs" style={{ color: "var(--text-3)" }}>{formatAge(comment.createdAt)}</span>
          {collapsed && (
            <button onClick={() => setCollapsed(false)}
              className="text-xs transition-colors"
              style={{ color: "var(--text-3)", marginLeft: "4px" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
            >
              [{comment.replies.length > 0 ? `+${comment.replies.length} replies` : "expand"}]
            </button>
          )}
        </div>

        {!collapsed && (
          <>
            {/* Body */}
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)", marginBottom: "8px" }}>{comment.content}</p>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: replyingTo || comment.replies.length > 0 ? "12px" : "0" }}>
              {session && !replyingTo && (
                <button onClick={() => openReply(displayName(comment.user))}
                  className="text-xs font-medium transition-colors"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                >
                  Reply
                </button>
              )}
              {session?.user?.id === comment.user.id && (
                <button onClick={() => onDelete(comment.id)}
                  className="text-xs transition-colors"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#f43f5e")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                >
                  Delete
                </button>
              )}
            </div>

            {/* Reply form */}
            {replyingTo && (
              <div className="mb-3 rounded-lg p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  maxLength={1000}
                  rows={2}
                  autoFocus
                  className="w-full text-sm px-0 py-0 resize-none"
                  style={{ background: "transparent", border: "none", color: "var(--text)", outline: "none" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "8px" }}>
                  <button type="button" onClick={() => { setReplyingTo(null); setReplyText(""); }}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ color: "var(--text-3)", background: "transparent" }}
                  >
                    Cancel
                  </button>
                  <button onClick={submitReply} disabled={submitting || !replyText.trim()}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{
                      background: submitting || !replyText.trim() ? "rgba(244,63,94,0.2)" : "#f43f5e",
                      color: submitting || !replyText.trim() ? "rgba(255,255,255,0.4)" : "#fff",
                      cursor: submitting || !replyText.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    {submitting ? "Posting…" : "Post Reply"}
                  </button>
                </div>
              </div>
            )}

            {/* Replies — indented with vertical line */}
            {comment.replies.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {comment.replies.map(r => (
                  <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                    <div style={{ display: "flex", gap: "0" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "24px", flexShrink: 0 }}>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0"
                          style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-3)", fontSize: "10px", border: "1px solid var(--border)" }}>
                          {displayName(r.user)[0].toUpperCase()}
                        </div>
                        {r.replies.length > 0 && (
                          <div style={{ width: "2px", flex: 1, marginTop: "6px", background: "var(--border)", minHeight: "20px" }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingLeft: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{displayName(r.user)}</span>
                          <span className="text-xs" style={{ color: "var(--text-3)" }}>{formatAge(r.createdAt)}</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)", marginBottom: "6px" }}>{r.content}</p>
                        <div style={{ display: "flex", gap: "12px" }}>
                          {session && !replyingTo && (
                            <button onClick={() => openReply(displayName(r.user), r.id)}
                              className="text-xs transition-colors"
                              style={{ color: "var(--text-3)" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
                              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                            >
                              Reply
                            </button>
                          )}
                          {session?.user?.id === r.user.id && (
                            <button onClick={() => onDelete(r.id)}
                              className="text-xs transition-colors"
                              style={{ color: "var(--text-3)" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#f43f5e")}
                              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                            >
                              Delete
                            </button>
                          )}
                        </div>

                        {/* Replies to replies — further indented */}
                        {r.replies.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                            {r.replies.map(rr => (
                              <div key={rr.id} style={{ display: "flex", gap: "0" }}>
                                <div style={{ width: "20px", flexShrink: 0, display: "flex", justifyContent: "center" }}>
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0"
                                    style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-3)", fontSize: "9px", border: "1px solid var(--border)" }}>
                                    {displayName(rr.user)[0].toUpperCase()}
                                  </div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0, paddingLeft: "10px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                    <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{displayName(rr.user)}</span>
                                    <span className="text-xs" style={{ color: "var(--text-3)" }}>{formatAge(rr.createdAt)}</span>
                                  </div>
                                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)", marginBottom: "6px" }}>{rr.content}</p>
                                  <div style={{ display: "flex", gap: "12px" }}>
                                    {session && !replyingTo && (
                                      <button onClick={() => openReply(displayName(rr.user), r.id)}
                                        className="text-xs transition-colors"
                                        style={{ color: "var(--text-3)" }}
                                        onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
                                        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                                      >
                                        Reply
                                      </button>
                                    )}
                                    {session?.user?.id === rr.user.id && (
                                      <button onClick={() => onDelete(rr.id)}
                                        className="text-xs transition-colors"
                                        style={{ color: "var(--text-3)" }}
                                        onMouseEnter={e => (e.currentTarget.style.color = "#f43f5e")}
                                        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
