import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { RsiBucket } from "../lib/breadth-engine";

interface Props {
  buckets: RsiBucket[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as RsiBucket;
  const label =
    d.range.startsWith("0-") || d.range.startsWith("10-") || d.range.startsWith("20-")
      ? "Oversold zone"
      : d.range.startsWith("70-") || d.range.startsWith("80-") || d.range.startsWith("90-")
        ? "Overbought zone"
        : "Neutral zone";
  return (
    <div className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-text-primary">RSI {d.range}</p>
      <p className="text-text-secondary">{d.count} stocks</p>
      <p className="text-text-muted">{label}</p>
    </div>
  );
}

export function RsiDistribution({ buckets }: Props) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <XAxis
            dataKey="range"
            tick={{ fill: "var(--color-text-muted)", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-bg-hover)", opacity: 0.5 }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {buckets.map((b, i) => (
              <Cell key={i} fill={b.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
