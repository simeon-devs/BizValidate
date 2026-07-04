"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ValidationRow } from "@/lib/fixtures";
import { formatDate } from "@/lib/utils/format";

type Point = { label: string; score: number; business: string };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Point }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border-strong bg-card px-3 py-2">
      <p className="text-xs font-medium text-foreground">{p.business}</p>
      <p className="font-mono text-[11px] text-muted-foreground">{p.label}</p>
      <p className="mt-1 font-mono text-sm text-foreground">
        Score <span className="text-accent">{p.score}</span>
      </p>
    </div>
  );
}

export function ScoreChart({ data }: { data: ValidationRow[] }) {
  // Scored rows only, oldest → newest for a left-to-right trajectory.
  const points: Point[] = data
    .filter((v): v is typeof v & { score: number } => v.score !== null)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .map((v) => ({
      label: formatDate(v.date),
      score: v.score,
      business: v.business,
    }));

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ top: 8, right: 16, bottom: 8, left: -8 }}
          >
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--subtle-foreground)"
              tick={{
                fill: "var(--muted-foreground)",
                fontSize: 11,
                fontFamily: "var(--font-dm-mono)",
              }}
              tickLine={false}
              axisLine={{ stroke: "var(--border-strong)" }}
              minTickGap={24}
            />
            <YAxis
              domain={[0, 100]}
              stroke="var(--subtle-foreground)"
              tick={{
                fill: "var(--muted-foreground)",
                fontSize: 11,
                fontFamily: "var(--font-dm-mono)",
              }}
              tickLine={false}
              axisLine={{ stroke: "var(--border-strong)" }}
              width={40}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{
                r: 3,
                fill: "var(--background)",
                stroke: "var(--accent)",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 5,
                fill: "var(--accent)",
                stroke: "var(--background)",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
