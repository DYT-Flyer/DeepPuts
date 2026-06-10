"use client";

import Link from "next/link";
import { ConvictionBadge } from "./conviction-badge";
import { SignalBadge } from "./signal-badge";
import { VoteButtons } from "./social/vote-buttons";
import type { EventFeedItem } from "@/types";

interface Props {
  item: EventFeedItem;
  loggedIn?: boolean;
}

const ASSET_BORDER: Record<string, string> = {
  stock: "#f59e0b",
  crypto: "#3b82f6",
};

export function EventFeedRow({ item, loggedIn }: Props) {
  const time = new Date(item.publishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = new Date(item.publishedAt).toLocaleDateString([], { month: "short", day: "numeric" });
  const isHighConviction = (item.analysis?.convictionScore ?? 0) >= 7;
  const borderColor = ASSET_BORDER[item.assetClass] ?? "#555";

  return (
    <div
      className="flex gap-0 transition-colors"
      style={{
        borderBottom: "1px solid var(--border)",
        background: isHighConviction ? "rgba(244,63,94,0.03)" : "transparent",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = isHighConviction ? "rgba(244,63,94,0.06)" : "rgba(255,255,255,0.02)")}
      onMouseLeave={e => (e.currentTarget.style.background = isHighConviction ? "rgba(244,63,94,0.03)" : "transparent")}
    >
      {/* Asset-class left border accent */}
      <div style={{ width: "3px", flexShrink: 0, background: borderColor, opacity: 0.6, borderRadius: "2px 0 0 2px" }} />

      <div className="flex gap-4 px-4 py-3 flex-1 min-w-0">
        {/* Timestamp */}
        <div className="shrink-0 w-14 text-right pt-0.5">
          <p className="text-xs font-mono" style={{ color: "#888" }}>{time}</p>
          <p className="text-xs" style={{ color: "#666" }}>{date}</p>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
            {item.analysis && <ConvictionBadge score={item.analysis.convictionScore} size="sm" />}
            <div style={{ flex: 1, minWidth: 0 }}>
              {item.articleUrl ? (
                <a
                  href={item.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm leading-snug line-clamp-2 transition-colors"
                  style={{ color: "#fff" }}
                >
                  {item.headline}
                </a>
              ) : (
                <p className="text-sm leading-snug line-clamp-2" style={{ color: "#fff" }}>
                  {item.headline}
                </p>
              )}
            </div>
            {/* Analyzed / No thesis badge */}
            <div className="shrink-0">
              {item.analysis ? (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.08)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.15)", fontSize: "10px" }}>
                  Analyzed
                </span>
              ) : (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "#555", border: "1px solid var(--border)", fontSize: "10px" }}>
                  No thesis
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {item.analysis && <SignalBadge type={item.analysis.signalType} size="sm" />}
            <span className="text-xs capitalize" style={{ color: "#888" }}>{item.assetClass}</span>
            {item.tickers.slice(0, 5).map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span style={{ color: "#444" }}>·</span>
                <Link
                  href={`/ticker/${t.replace("X:", "").replace("USD", "")}`}
                  className="text-xs font-mono transition-colors"
                  style={{ color: "#aaa" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
                >
                  {t}
                </Link>
              </span>
            ))}
            {item.analysis?.id && (
              <>
                <span style={{ flex: 1 }} />
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <VoteButtons
                    analysisId={item.analysis.id}
                    initialScore={item.analysis.voteScore}
                    initialUserVote={item.analysis.userVote}
                    loggedIn={!!loggedIn}
                  />
                  <span style={{ color: "#555", lineHeight: 1, fontSize: "13px" }}>·</span>
                  <Link href={`/opportunity/${item.analysis.id}`} className="text-xs transition-colors"
                    style={{ color: "#aaa" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
                  >Comments</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
