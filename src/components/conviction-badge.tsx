"use client";

interface Props {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function ConvictionBadge({ score, size = "md" }: Props) {
  const isHigh = score >= 7;
  const isMid = score >= 4 && score < 7;

  const bg = isHigh ? "rgba(244,63,94,0.1)" : isMid ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)";
  const border = isHigh ? "rgba(244,63,94,0.3)" : isMid ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)";
  const color = isHigh ? "#f43f5e" : isMid ? "#f59e0b" : "#555";

  const fontSize = size === "lg" ? "20px" : size === "sm" ? "11px" : "12px";
  const padding = size === "lg" ? "4px 10px" : size === "sm" ? "2px 6px" : "2px 8px";

  return (
    <span
      style={{
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontSize,
        padding,
        fontFamily: "var(--font-mono, monospace)",
        fontWeight: 600,
        borderRadius: "6px",
        display: "inline-flex",
        alignItems: "center",
        gap: "2px",
        whiteSpace: "nowrap",
        letterSpacing: "-0.02em",
      }}
      title={`Conviction: ${score}/10`}
    >
      {score}
      <span style={{ opacity: 0.5, fontWeight: 400 }}>/10</span>
    </span>
  );
}
