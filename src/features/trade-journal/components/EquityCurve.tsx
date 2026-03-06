import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { DailyPnl } from "../lib/journal";

interface Props {
  dailyPnl: DailyPnl[];
}

export function EquityCurve({ dailyPnl }: Props) {
  const data = useMemo(() => {
    let cumulative = 0;
    return dailyPnl.map((d) => {
      cumulative += d.pnl;
      return {
        date: d.date.slice(5), // MM-DD
        pnl: Math.round(cumulative * 100) / 100,
        daily: Math.round(d.pnl * 100) / 100,
      };
    });
  }, [dailyPnl]);

  if (data.length < 2) return null;

  const maxPnl = Math.max(...data.map((d) => d.pnl));
  const minPnl = Math.min(...data.map((d) => d.pnl));
  const isProfit = data[data.length - 1]?.pnl >= 0;

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Equity Curve</h3>
        <span className={`font-mono text-sm font-bold ${isProfit ? "text-green" : "text-red"}`}>
          {isProfit ? "+" : ""}${data[data.length - 1]?.pnl.toFixed(2)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGradGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="equityGradRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--chart-tick)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "var(--chart-tick)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={55}
            tickCount={5}
            tickFormatter={(v: number) => `$${Math.round(v)}`}
            domain={[Math.floor(Math.min(minPnl, 0) * 1.1), Math.ceil(Math.max(maxPnl, 0) * 1.1)]}
          />
          <ReferenceLine y={0} stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--chart-tooltip-bg)",
              border: "1px solid var(--chart-tooltip-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-text-muted)" }}
            formatter={(val: number) => [`$${val.toFixed(2)}`, "P&L"]}
          />
          <Area
            type="monotone"
            dataKey="pnl"
            stroke={isProfit ? "#22c55e" : "#ef4444"}
            strokeWidth={2}
            fill={isProfit ? "url(#equityGradGreen)" : "url(#equityGradRed)"}
            dot={false}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
