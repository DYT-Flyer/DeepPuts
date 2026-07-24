"use client";

import Link from "next/link";
import { ConvictionBadge } from "./conviction-badge";
import { SignalBadge } from "./signal-badge";
import { VoteButtons } from "./social/vote-buttons";
import type { OpportunityItem } from "@/types";
import { useRouter } from "next/navigation";
import { formatCatalyst, getDomain } from "@/lib/utils";

interface Props {
  item: OpportunityItem;
  loggedIn?: boolean;
}

export function OpportunityCard({ item, loggedIn }: Props) {
  const router = useRouter();
  const age = formatAge(item.event.publishedAt);
  const domain = getDomain(item.event.articleUrl);

  const catalyst = item.catalystDate ? formatCatalyst(item.catalystDate) : null;

  return (
    <div
      onClick={() => router.push(`/opportunity/${item.id}#comments`)}
      className="group rounded-xl p-4 flex flex-col gap-3 transition-all duration-200 cursor-pointer"
      style={{
        background: "#161616",
        border: "1px solid var(--border)",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.background = "#1a1a1a"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "#161616"; }}
    >
      {/* Age + Catalyst */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {catalyst ? (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: catalyst.urgent ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)",
              color: catalyst.urgent ? "#f59e0b" : "#666",
              border: `1px solid ${catalyst.urgent ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.08)"}`,
            }}
          >{catalyst.label}</span>
        ) : <span />}
        <span className="text-xs" style={{ color: "var(--text-3)" }}>{age}</span>
      </div>

      {/* Score + Headline */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <ConvictionBadge score={item.convictionScore} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {item.event.articleUrl ? (
            <a
              href={item.event.articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium leading-snug line-clamp-2 transition-colors inline"
              style={{ color: "#d4d4d4" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "#d4d4d4")}
            >
              {item.event.headline}
              {domain && <span className="text-xs font-normal ml-1.5" style={{ color: "var(--text-3)" }}>{domain}</span>}
            </a>
          ) : (
            <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: "#d4d4d4" }}>
              {item.event.headline}
            </p>
          )}
        </div>
      </div>

      {/* Bear thesis */}
      <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "var(--text-2)" }}>
        {item.bearThesis}
      </p>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
        <SignalBadge type={item.signalType} />
        {item.sector && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#aaa", border: "1px solid rgba(255,255,255,0.1)" }}>
            {item.sector}
          </span>
        )}
        {item.affectedTickers.length > 0 && (
          <span style={{ color: "#444", lineHeight: 1, fontSize: "14px" }}>·</span>
        )}
        {item.affectedTickers.slice(0, 6).map((ticker, i) => (
          <span key={ticker} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            {i > 0 && <span style={{ color: "#444", lineHeight: 1, fontSize: "14px" }}>·</span>}
            <Link
              href={`/ticker/${ticker}`}
              className="text-xs font-mono px-2 py-0.5 rounded transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", color: "#bbb", border: "1px solid var(--border)" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#ddd"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#bbb"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            >
              {ticker}
            </Link>
          </span>
        ))}
        {item.affectedTickers.length > 6 && (
          <span className="text-xs" style={{ color: "var(--text-3)" }}>+{item.affectedTickers.length - 6}</span>
        )}

        {/* AI badge */}
        <span className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: "rgba(255,255,255,0.03)", color: "#333", border: "1px solid rgba(255,255,255,0.05)", marginLeft: "auto" }}>
          AI
        </span>

        {/* Vote + comments */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
          <VoteButtons
            analysisId={item.id}
            initialScore={item.voteScore}
            initialUserVote={item.userVote}
            loggedIn={!!loggedIn}
          />
          <span style={{ color: "#555", lineHeight: 1, fontSize: "14px" }}>·</span>
          <Link
            href={`/opportunity/${item.id}`}
            className="text-xs transition-colors"
            style={{ color: "#bbb" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#ddd")}
            onMouseLeave={e => (e.currentTarget.style.color = "#bbb")}
          >
            {item.commentCount > 0 ? `${item.commentCount} Comment${item.commentCount !== 1 ? "s" : ""}` : "Comments"}
          </Link>
        </div>
      </div>
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
