"use client";

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

const SIGNAL_STYLES: Record<SignalType, { bg: string; border: string; color: string; dot: string }> = {
  earnings_miss: { bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)", color: "#fb923c", dot: "#f97316" },
  sec_filing:    { bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.2)", color: "#c084fc", dot: "#a855f7" },
  news_negative: { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)", color: "#60a5fa", dot: "#3b82f6" },
  macro:         { bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.15)", color: "#94a3b8", dot: "#64748b" },
  crypto_dump:   { bg: "rgba(236,72,153,0.08)", border: "rgba(236,72,153,0.2)", color: "#f472b6", dot: "#ec4899" },
  insider_sell:  { bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.2)", color: "#fb7185", dot: "#f43f5e" },
  guidance_cut:  { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", color: "#fbbf24", dot: "#f59e0b" },
  regulatory:    { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", color: "#f87171", dot: "#ef4444" },
};

const DEFAULT_STYLE = { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", color: "#666", dot: "#444" };

interface Props {
  type: SignalType | string;
  size?: "sm" | "md";
}

export function SignalBadge({ type, size = "md" }: Props) {
  const label = SIGNAL_LABELS[type as SignalType] || type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const s = SIGNAL_STYLES[type as SignalType] || DEFAULT_STYLE;
  const fontSize = size === "sm" ? "11px" : "12px";
  const padding = size === "sm" ? "2px 7px" : "2px 9px";

  return (
    <span
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        fontSize,
        padding,
        fontWeight: 500,
        borderRadius: "999px",
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}
