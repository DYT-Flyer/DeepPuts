"use client";

import { cn } from "@/lib/utils";

interface Props {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function ConvictionBadge({ score, size = "md" }: Props) {
  const color =
    score >= 7
      ? "bg-red-500/20 text-red-400 border-red-500/40"
      : score >= 4
      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
      : "bg-zinc-700/50 text-zinc-400 border-zinc-600";

  const sizeClass =
    size === "lg"
      ? "text-2xl font-bold px-3 py-1"
      : size === "sm"
      ? "text-xs px-1.5 py-0.5"
      : "text-sm font-semibold px-2 py-0.5";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-mono",
        color,
        sizeClass
      )}
      title={`Conviction: ${score}/10`}
    >
      {score}/10
    </span>
  );
}
