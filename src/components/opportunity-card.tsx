"use client";

import Link from "next/link";
import { ConvictionBadge } from "./conviction-badge";
import { SignalBadge } from "./signal-badge";
import { VoteButtons } from "./social/vote-buttons";
import { CardPerformance } from "./card-performance";
import type { OpportunityItem } from "@/types";
import { useRouter } from "next/navigation";
import { formatCatalyst, getDomain } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface Props {
  item: OpportunityItem;
  loggedIn?: boolean;
}

export function OpportunityCard({ item, loggedIn }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const isPro = (session?.user as any)?.tier === "PRO";
  const age = formatAge(item.event.publishedAt);
  const domain = getDomain(item.event.articleUrl);

  const catalyst = item.catalystDate ? formatCatalyst(item.catalystDate) : null;

  return (
    <div
      onClick={() => router.push(`/opportunity/${item.id}#comments`)}
      className="rounded-xl px-4 py-4 transition-all cursor-pointer"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.background = "var(--surface-hover)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
    >
      <div className="flex-1 min-w-0">
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "4px" }}>
          <ConvictionBadge score={item.convictionScore} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="w-full truncate leading-snug">
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
          </div>
          <span className="shrink-0 text-xs whitespace-nowrap text-right pt-0.5" style={{ color: "var(--text-3)" }}>
            {formatAge(item.event.publishedAt)}
          </span>
        </div>
        <div className="relative mt-2">
          <p className={`text-xs leading-relaxed line-clamp-2 ${!isPro ? "blur-[4px] select-none opacity-50" : ""}`} style={{ color: "var(--text-2)" }}>
            {item.bearThesis}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <SignalBadge type={item.signalType} size="sm" />
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
          {item.affectedTickers.length > 0 && (
            <CardPerformance opportunityId={item.id} />
          )}
          <span style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
            <VoteButtons
              analysisId={item.id}
              initialScore={item.voteScore}
              initialUserVote={item.userVote}
              loggedIn={!!loggedIn}
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

function formatAge(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}
