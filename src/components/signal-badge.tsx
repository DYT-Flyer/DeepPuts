"use client";

import { cn } from "@/lib/utils";
import type { SignalType } from "@/types";

const SIGNAL_LABELS: Record<SignalType, string> = {
  earnings_miss: "Earnings Miss",
  sec_filing: "SEC Filing",
  news_negative: "Negative News",
  macro: "Macro",
  crypto_dump: "Crypto Dump",
  insider_sell: "Insider Sell",
  guidance_cut: "Guidance Cut",
  regulatory: "Regulatory",
};

const SIGNAL_COLORS: Record<SignalType, string> = {
  earnings_miss: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  sec_filing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  news_negative: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  macro: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  crypto_dump: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  insider_sell: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  guidance_cut: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  regulatory: "bg-red-500/20 text-red-400 border-red-500/30",
};

interface Props {
  type: SignalType | string;
  size?: "sm" | "md";
}

export function SignalBadge({ type, size = "md" }: Props) {
  const label = SIGNAL_LABELS[type as SignalType] || type;
  const color = SIGNAL_COLORS[type as SignalType] || "bg-zinc-700 text-zinc-400 border-zinc-600";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-medium",
        color,
        size === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-0.5"
      )}
    >
      {label}
    </span>
  );
}
