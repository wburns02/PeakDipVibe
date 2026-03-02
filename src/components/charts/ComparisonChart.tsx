import { memo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts";

interface ComparisonChartProps {
  data: Record<string, string | number>[];
  tickers: string[];
  colors: string[];
}

export const ComparisonChart = memo(function ComparisonChart({ data, tickers, colors }: ComparisonChartProps) {
  if (!data || data.length === 0 || !tickers || tickers.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-sm text-text-muted">
        No comparison data available
      </div>
    );
  }

  return (
    <div role="img" aria-label="Stock comparison chart showing relative performance">
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2e45" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickFormatter={(d: string) => {
            const [, m, day] = d.split("-");
            return `${m}/${day}`;
          }}
          minTickGap={40}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`}
          width={55}
        />
        <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--color-text-muted)" }}
          formatter={((value: number | undefined, name: string | undefined) => [
            value != null ? `${value > 0 ? "+" : ""}${value.toFixed(2)}%` : "—",
            name ?? "",
          ]) as never}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {tickers.map((ticker, i) => (
          <Line
            key={ticker}
            type="monotone"
            dataKey={ticker}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
});
