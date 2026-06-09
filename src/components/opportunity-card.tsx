"use client";

import Link from "next/link";
import { ConvictionBadge } from "./conviction-badge";
import { SignalBadge } from "./signal-badge";
import type { OpportunityItem } from "@/types";

interface Props {
  item: OpportunityItem;
}

export function OpportunityCard({ item }: Props) {
  const age = formatAge(item.event.publishedAt);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SignalBadge type={item.signalType} />
          {item.sector && (
            <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
              {item.sector}
            </span>
          )}
          <span className="text-xs text-zinc-500">{age}</span>
        </div>
        <ConvictionBadge score={item.convictionScore} />
      </div>

      {/* Headline */}
      {item.event.articleUrl ? (
        <a
          href={item.event.articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-zinc-300 font-medium mb-2 line-clamp-2 leading-snug hover:text-zinc-100 hover:underline transition-colors"
        >
          {item.event.headline}
        </a>
      ) : (
        <p className="text-sm text-zinc-300 font-medium mb-2 line-clamp-2 leading-snug">
          {item.event.headline}
        </p>
      )}

      {/* Bear thesis */}
      <p className="text-sm text-zinc-400 mb-3 line-clamp-3 leading-relaxed">
        {item.bearThesis}
      </p>

      {/* Tickers */}
      <div className="flex items-center gap-2 flex-wrap">
        {item.affectedTickers.slice(0, 6).map((ticker, i) => (
          <span key={ticker} className="flex items-center gap-2">
            {i > 0 && <span className="text-zinc-700">·</span>}
            <Link
              href={`/ticker/${ticker}`}
              className="text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700 transition-colors"
            >
              {ticker}
            </Link>
          </span>
        ))}
        {item.affectedTickers.length > 6 && (
          <span className="text-xs text-zinc-600 ml-1">
            +{item.affectedTickers.length - 6} more
          </span>
        )}
        <span className="ml-auto text-xs text-zinc-600 capitalize">
          {item.event.assetClass}
        </span>
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
