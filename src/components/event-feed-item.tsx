"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConvictionBadge } from "./conviction-badge";
import { SignalBadge } from "./signal-badge";
import { VoteButtons } from "./social/vote-buttons";
import { CardPerformance } from "./card-performance";
import { getDomain, formatAge } from "@/lib/utils";
import type { EventFeedItem } from "@/types";
import { useSession } from "next-auth/react";

interface Props {
  item: EventFeedItem;
  loggedIn?: boolean;
}

export function EventFeedRow({ item, loggedIn }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAnalyzed = !!item.analysis;
  const isPro = (session?.user as any)?.tier === "PRO";
  const displayTickers = item.analysis ? item.analysis.affectedTickers : item.tickers;
  
  return (
    <div
      onClick={() => {
        if (!loggedIn) {
          router.push("/login");
        } else if (isAnalyzed) {
          router.push(`/opportunity/${item.analysis!.id}#comments`);
        }
      }}
      className={`rounded-xl px-4 py-4 transition-all mb-3 relative overflow-hidden ${isAnalyzed ? "cursor-pointer" : ""}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", cursor: isAnalyzed || !loggedIn ? "pointer" : "default" }}
      onMouseEnter={e => { if (isAnalyzed || !loggedIn) { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.background = "var(--surface-hover)"; } }}
      onMouseLeave={e => { if (isAnalyzed || !loggedIn) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; } }}
    >
      <div className={`transition-all ${!loggedIn ? "blur-[6px] select-none opacity-40 pointer-events-none" : ""}`}>
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
                  className="text-sm font-medium transition-colors hover:underline inline-flex items-center gap-1.5"
                  style={{ color: "var(--text)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--red)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text)")}
                >
                  {item.headline}
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
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
        <div className="relative mt-2">
          <p className={`text-xs leading-relaxed line-clamp-2 ${!isPro ? "blur-[4px] select-none opacity-50" : ""}`} style={{ color: "var(--text-2)" }}>
            {item.analysis.bearThesis}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {item.analysis && <SignalBadge type={item.analysis.signalType} size="sm" />}
        <span className="text-xs capitalize" style={{ color: "#888" }}>{item.assetClass}</span>
        {displayTickers.slice(0, 5).map((t) => (
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
        {displayTickers.length > 0 && (
          <CardPerformance 
            opportunityId={item.analysis?.id} 
            tickers={displayTickers}
            pubDate={item.publishedAt}
            assetClass={item.assetClass}
          />
        )}
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
      {!loggedIn && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/10">
          <Link href="/login" onClick={e => e.stopPropagation()} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full transition-colors hover:bg-white/10" style={{ background: "var(--surface-2)", color: "var(--text-1)", border: "1px solid var(--border)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Sign in to view
          </Link>
        </div>
      )}
    </div>
  );
}
