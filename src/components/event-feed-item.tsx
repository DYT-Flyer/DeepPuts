"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConvictionBadge } from "./conviction-badge";
import { SignalBadge } from "./signal-badge";
import { VoteButtons } from "./social/vote-buttons";
import { getDomain, formatAge } from "@/lib/utils";
import type { EventFeedItem } from "@/types";

interface Props {
  item: EventFeedItem;
  loggedIn?: boolean;
}

export function EventFeedRow({ item, loggedIn }: Props) {
  const router = useRouter();
  const isAnalyzed = !!item.analysis;
  
  return (
    <div
      onClick={() => isAnalyzed ? router.push(`/opportunity/${item.analysis!.id}#comments`) : null}
      className={`rounded-xl px-4 py-4 transition-all mb-3 ${isAnalyzed ? "cursor-pointer" : ""}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      onMouseEnter={e => { if (isAnalyzed) e.currentTarget.style.borderColor = "var(--border-hover)"; }}
      onMouseLeave={e => { if (isAnalyzed) e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "4px" }}>
        {item.analysis ? (
          <ConvictionBadge score={item.analysis.convictionScore} size="sm" />
        ) : (
          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "var(--surface-2)", color: "#555", border: "1px solid var(--border)" }}>
            RAW
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="w-full truncate leading-snug">
            {item.articleUrl ? (
              <>
                <a href={item.articleUrl} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm font-medium transition-colors hover:underline"
                  style={{ color: "#fff" }}
                >
                  {item.headline}
                </a>
                {getDomain(item.articleUrl) && (
                  <>
                    {" "}
                    <span className="text-xs font-normal whitespace-nowrap" style={{ color: "var(--text-3)" }}>
                      {getDomain(item.articleUrl)}
                    </span>
                  </>
                )}
              </>
            ) : (
              <span className="text-sm font-medium" style={{ color: "#fff" }}>
                {item.headline}
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-xs whitespace-nowrap text-right pt-0.5" style={{ color: "var(--text-3)" }}>
          {formatAge(item.publishedAt)}
        </span>
      </div>

      {item.analysis && (
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-2)" }}>
          {item.analysis.bearThesis}
        </p>
      )}

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {item.analysis && <SignalBadge type={item.analysis.signalType} size="sm" />}
        <span className="text-xs capitalize" style={{ color: "#888" }}>{item.assetClass}</span>
        {item.tickers.slice(0, 5).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span style={{ color: "#444" }}>·</span>
            <Link
              href={`/ticker/${t.replace("X:", "").replace("USD", "")}`}
              className="text-xs font-mono transition-colors"
              onClick={(e) => e.stopPropagation()}
              style={{ color: "#aaa" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
            >
              {t}
            </Link>
          </span>
        ))}
        {item.analysis && (
          <>
            <span style={{ flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
              <VoteButtons
                analysisId={item.analysis.id}
                initialScore={item.analysis.voteScore}
                initialUserVote={item.analysis.userVote}
                loggedIn={!!loggedIn}
              />
              <span style={{ color: "#555", lineHeight: 1, fontSize: "13px" }}>·</span>
              <Link href={`/opportunity/${item.analysis.id}`} className="text-xs transition-colors"
                onClick={(e) => e.stopPropagation()}
                style={{ color: "#aaa" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "#aaa")}
              >Comments</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
