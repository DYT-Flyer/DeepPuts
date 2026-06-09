"use client";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { SparklinePoint } from "@/types";

interface Props {
  data: SparklinePoint[];
  height?: number;
}

export function Sparkline({ data, height = 80 }: Props) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-zinc-600 text-sm"
        style={{ height }}
      >
        No price data
      </div>
    );
  }

  const firstPrice = data[0].c;
  const lastPrice = data[data.length - 1].c;
  const isDown = lastPrice < firstPrice;
  const color = isDown ? "#ef4444" : "#22c55e";

  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.t).toLocaleDateString(),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={formatted}>
        <Line
          type="monotone"
          dataKey="c"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3 }}
        />
        <ReferenceLine y={firstPrice} stroke="#52525b" strokeDasharray="3 3" />
        <Tooltip
          contentStyle={{
            background: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "6px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "#a1a1aa" }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
          labelFormatter={(label) => label}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
