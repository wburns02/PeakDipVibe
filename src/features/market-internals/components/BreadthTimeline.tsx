import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { HistoricalBreadth } from "../lib/breadth-engine";

interface Props {
  data: HistoricalBreadth[];
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-text-primary">
        {new Date(label + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
}

export function BreadthTimeline({ data }: Props) {
  // Show every ~20th data point for x-axis labels
  const step = Math.max(1, Math.floor(data.length / 12));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="breadth50" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="breadth200" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={step}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ReferenceLine y={50} stroke="var(--color-border)" strokeDasharray="4 4" />
          <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="2 4" strokeOpacity={0.4} />
          <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="2 4" strokeOpacity={0.4} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="pctAboveSma200"
            name="Above SMA-200"
            stroke="#3b82f6"
            fill="url(#breadth200)"
            strokeWidth={1.5}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="pctAboveSma50"
            name="Above SMA-50"
            stroke="#22c55e"
            fill="url(#breadth50)"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
