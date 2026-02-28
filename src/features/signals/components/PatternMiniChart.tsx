import {
  ComposedChart,
  Bar,
  ReferenceLine,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import type { PatternSignal } from "@/api/types/signals";

interface PatternMiniChartProps {
  signal: PatternSignal;
}

export function PatternMiniChart({ signal }: PatternMiniChartProps) {
  const { prev_close, day0_open, day0_high, day0_close, day1_close } = signal;

  if (prev_close == null || day0_close == null) {
    return <div className="h-[28px] w-20" />;
  }

  // Three bars: prev close, day0 close, day1 close
  const data = [
    { name: "prev", value: prev_close },
    { name: "day0", value: day0_close },
    ...(day1_close != null ? [{ name: "day1", value: day1_close }] : []),
  ];

  const allValues = data.map((d) => d.value);
  if (day0_high != null) allValues.push(day0_high);
  if (day0_open != null) allValues.push(day0_open);

  const min = Math.min(...allValues) * 0.998;
  const max = Math.max(...allValues) * 1.002;

  const getColor = (name: string, value: number) => {
    if (name === "prev") return "#64748b";
    if (name === "day0") return value < (day0_open ?? prev_close) ? "#ef4444" : "#22c55e";
    // day1: green if recovery (higher than day0 close)
    return value > day0_close ? "#22c55e" : "#ef4444";
  };

  return (
    <ComposedChart width={80} height={28} data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
      <XAxis dataKey="name" hide />
      <YAxis domain={[min, max]} hide />
      <ReferenceLine y={prev_close} stroke="#6366f1" strokeDasharray="2 2" strokeWidth={1} />
      <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={16}>
        {data.map((entry) => (
          <Cell key={entry.name} fill={getColor(entry.name, entry.value)} />
        ))}
      </Bar>
    </ComposedChart>
  );
}
