"use client";

import Link from "next/link";
import { ConvictionBadge } from "./conviction-badge";
import { SignalBadge } from "./signal-badge";
import type { EventFeedItem } from "@/types";

interface Props {
  item: EventFeedItem;
}

export function EventFeedRow({ item }: Props) {
  const time = new Date(item.publishedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = new Date(item.publishedAt).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex gap-3 py-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-900/50 px-2 rounded transition-colors">
      {/* Time */}
      <div className="flex-shrink-0 text-right w-16">
        <p className="text-xs text-zinc-400 font-mono">{time}</p>
        <p className="text-xs text-zinc-600">{date}</p>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {item.articleUrl ? (
          <a
            href={item.articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-zinc-200 leading-snug line-clamp-2 mb-1.5 hover:text-zinc-100 hover:underline transition-colors"
          >
            {item.headline}
          </a>
        ) : (
          <p className="text-sm text-zinc-200 leading-snug line-clamp-2 mb-1.5">
            {item.headline}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          {item.analysis && <SignalBadge type={item.analysis.signalType} size="sm" />}
          <span className="text-xs text-zinc-600 capitalize">{item.assetClass}</span>
          {item.tickers.slice(0, 4).map((t, i) => (
            <span key={t} className="flex items-center gap-2">
              <span className="text-zinc-700">·</span>
              <Link
                href={`/ticker/${t.replace("X:", "").replace("USD", "")}`}
                className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {t}
              </Link>
            </span>
          ))}
        </div>
      </div>

      {/* Score */}
      <div className="flex-shrink-0">
        {item.analysis ? (
          <ConvictionBadge score={item.analysis.convictionScore} size="sm" />
        ) : (
          <span className="text-xs text-zinc-600 font-mono">–/10</span>
        )}
      </div>
    </div>
  );
}
