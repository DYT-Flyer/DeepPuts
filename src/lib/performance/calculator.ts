export type ThesisStatus = "pending" | "confirmed" | "invalidated" | "mixed" | "expired";

export function computeThesisStatus(
  pubPrice: number | null,
  currentPrice: number | null,
  catalystDate: string | null,
): ThesisStatus {
  if (!pubPrice || !currentPrice) return "pending";
  const pctChange = ((currentPrice - pubPrice) / pubPrice) * 100;

  if (catalystDate) {
    const daysSince = (Date.now() - new Date(catalystDate).getTime()) / 86_400_000;
    if (daysSince > 30 && pctChange > -5) return "expired";
  }

  if (pctChange < -15) return "confirmed";
  if (pctChange < -5) return "mixed";
  if (pctChange > 15) return "invalidated";
  return "pending";
}

export const STATUS_LABELS: Record<ThesisStatus, { label: string; color: string; bg: string }> = {
  confirmed:   { label: "Confirmed",   color: "#34d399", bg: "rgba(52,211,153,0.1)"  },
  invalidated: { label: "Invalidated", color: "#f43f5e", bg: "rgba(244,63,94,0.1)"   },
  mixed:       { label: "Mixed",       color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  pending:     { label: "Pending",     color: "#666",    bg: "rgba(255,255,255,0.04)" },
  expired:     { label: "Expired",     color: "#444",    bg: "rgba(255,255,255,0.03)" },
};
