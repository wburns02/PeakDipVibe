import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import type { DivergenceType } from "../lib/divergence-engine";

interface Props {
  data: { date: string; close: number; rsi: number }[];
  type: DivergenceType;
  swingADate: string;
  swingBDate: string;
  swingAClose: number;
  swingBClose: number;
  swingARsi: number;
  swingBRsi: number;
}

export function DivergenceChart({
  data,
  type,
  swingADate,
  swingBDate,
  swingAClose,
  swingBClose,
  swingARsi,
  swingBRsi,
}: Props) {
  const color = type === "bullish" ? "#22c55e" : "#ef4444";

  return (
    <div className="space-y-1">
      {/* Price panel */}
      <div>
        <p className="mb-0.5 text-sm uppercase tracking-wider text-text-muted">Price</p>
        <ResponsiveContainer width="100%" height={70}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis domain={["auto", "auto"]} hide />
            <Line
              type="monotone"
              dataKey="close"
              stroke="var(--color-accent)"
              strokeWidth={1.5}
              dot={false}
              animationDuration={400}
            />
            <ReferenceDot
              x={swingADate}
              y={swingAClose}
              r={4}
              fill={color}
              stroke="white"
              strokeWidth={1.5}
            />
            <ReferenceDot
              x={swingBDate}
              y={swingBClose}
              r={4}
              fill={color}
              stroke="white"
              strokeWidth={1.5}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* RSI panel */}
      <div>
        <p className="mb-0.5 text-sm uppercase tracking-wider text-text-muted">RSI (14)</p>
        <ResponsiveContainer width="100%" height={50}>
          <LineChart data={data} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis domain={[0, 100]} hide />
            <ReferenceLine y={30} stroke="#22c55e30" strokeDasharray="3 3" />
            <ReferenceLine y={70} stroke="#ef444430" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="rsi"
              stroke="#818cf8"
              strokeWidth={1.5}
              dot={false}
              animationDuration={400}
            />
            <ReferenceDot
              x={swingADate}
              y={swingARsi}
              r={4}
              fill={color}
              stroke="white"
              strokeWidth={1.5}
            />
            <ReferenceDot
              x={swingBDate}
              y={swingBRsi}
              r={4}
              fill={color}
              stroke="white"
              strokeWidth={1.5}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 pt-0.5">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-3 rounded-full bg-accent" />
          <span className="text-sm text-text-muted">Price</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-3 rounded-full" style={{ backgroundColor: "#818cf8" }} />
          <span className="text-sm text-text-muted">RSI</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm text-text-muted">Swing</span>
        </div>
      </div>
    </div>
  );
}
