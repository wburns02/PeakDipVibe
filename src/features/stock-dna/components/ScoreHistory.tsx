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
import type { IndicatorHistoryRow } from "@/api/types/indicator";

interface Props {
  rsiHistory: IndicatorHistoryRow[];
  macdHistory: IndicatorHistoryRow[];
  sma50History: IndicatorHistoryRow[];
  priceHistory: { date: string; close: number }[];
}

export function ScoreHistory({ rsiHistory, macdHistory, sma50History, priceHistory }: Props) {
  const data = useMemo(() => {
    // Build a map of date -> indicators
    const dateMap: Record<string, Record<string, number | null>> = {};

    for (const r of rsiHistory) {
      if (!dateMap[r.date]) dateMap[r.date] = {};
      dateMap[r.date]["RSI_14"] = r.value;
    }
    for (const r of macdHistory) {
      if (!dateMap[r.date]) dateMap[r.date] = {};
      dateMap[r.date]["MACD"] = r.value;
    }
    for (const r of sma50History) {
      if (!dateMap[r.date]) dateMap[r.date] = {};
      dateMap[r.date]["SMA_50"] = r.value;
    }

    const priceMap: Record<string, number> = {};
    for (const p of priceHistory) {
      priceMap[p.date] = p.close;
    }

    // Compute a simplified score per day
    const dates = Object.keys(dateMap).sort();
    return dates
      .filter((d) => priceMap[d])
      .slice(-30)
      .map((date) => {
        const ind = dateMap[date];
        const price = priceMap[date];
        // Simplified score from RSI + SMA position
        let score = 50;
        const rsi = ind.RSI_14;
        if (rsi != null) {
          if (rsi < 30) score += 15;
          else if (rsi < 40) score += 8;
          else if (rsi > 70) score -= 15;
          else if (rsi > 60) score -= 5;
        }
        const sma = ind.SMA_50;
        if (sma != null && price > sma) score += 15;
        else if (sma != null) score -= 15;
        const macd = ind.MACD;
        if (macd != null && macd > 0) score += 10;
        else if (macd != null) score -= 10;

        return {
          date: date.slice(5), // MM-DD
          score: Math.max(0, Math.min(100, score)),
        };
      });
  }, [rsiHistory, macdHistory, sma50History, priceHistory]);

  if (data.length < 5) return null;

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">Score Trend (30 Days)</h3>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
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
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: "var(--chart-tick)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={28}
            tickFormatter={(v: number) => String(v)}
          />
          <ReferenceLine y={50} stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--chart-tooltip-bg)",
              border: `1px solid var(--chart-tooltip-border)`,
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-text-muted)" }}
            formatter={(val: number | undefined) => [`${val ?? 0}`, "Score"]}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#scoreGrad)"
            dot={false}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
