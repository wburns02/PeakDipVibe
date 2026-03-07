import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceDot,
  ReferenceLine,
  Tooltip,
} from "recharts";
import type { DetectedPattern } from "../lib/pattern-engine";
import { patternColor } from "../lib/pattern-engine";

interface Props {
  pattern: DetectedPattern;
}

export function PatternChart({ pattern: p }: Props) {
  const color = patternColor(p.type);
  const data = p.chartSlice;
  if (data.length < 3) return null;

  const prices = data.map((d) => d.close);
  const lo = Math.min(...prices, ...data.map((d) => d.low)) * 0.995;
  const hi = Math.max(...prices, ...data.map((d) => d.high)) * 1.005;

  // Build set of key point dates for ReferenceDots
  const kpMap = new Map(p.keyPoints.map((k) => [k.date, k]));

  return (
    <ResponsiveContainer width="100%" height={130}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`pg-${p.ticker}-${p.pattern}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" hide />
        <YAxis domain={[lo, hi]} hide />
        <Tooltip
          contentStyle={{
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 11,
          }}
          formatter={(v: number) => [`$${v.toFixed(2)}`, "Price"]}
          labelFormatter={(l: string) => l}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#pg-${p.ticker}-${p.pattern})`}
          dot={false}
          isAnimationActive={false}
        />

        {/* Neckline */}
        {p.neckline && (
          <ReferenceLine
            y={p.neckline}
            stroke="var(--color-text-muted)"
            strokeDasharray="4 3"
            strokeWidth={1}
          />
        )}

        {/* Target line */}
        <ReferenceLine
          y={p.targetPrice}
          stroke={color}
          strokeDasharray="6 3"
          strokeWidth={1}
          strokeOpacity={0.6}
        />

        {/* Key points */}
        {data.map((d) => {
          const kp = kpMap.get(d.date);
          if (!kp) return null;
          return (
            <ReferenceDot
              key={kp.date + kp.label}
              x={kp.date}
              y={kp.price}
              r={3.5}
              fill={color}
              stroke="var(--color-bg-secondary)"
              strokeWidth={1.5}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}
