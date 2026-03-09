import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, ClipboardList, Dna, ExternalLink, Star } from "lucide-react";
import { useChartData } from "@/api/hooks/usePrices";
import { useWatchlist } from "@/hooks/useWatchlist";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SqueezeStock, SqueezeHistory } from "../lib/squeeze-engine";
import { findPastSqueezes, buildBollingerChart, squeezeColor, squeezeLabel } from "../lib/squeeze-engine";

interface Props {
  stock: SqueezeStock;
  history: SqueezeHistory[];
  threshold: number;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function SqueezeDetail({ stock, history, threshold }: Props) {
  const { data: chartData, isLoading: chartLoading } = useChartData(stock.ticker, { limit: 120 });
  const { watchlist, toggle } = useWatchlist();
  const isWatching = watchlist.includes(stock.ticker);

  const bollingerData = useMemo(
    () => (chartData ? buildBollingerChart(chartData, threshold) : []),
    [chartData, threshold],
  );

  const pastSqueezes = useMemo(
    () => (chartData ? findPastSqueezes(chartData, threshold) : []),
    [chartData, threshold],
  );

  const squeezeStats = useMemo(() => {
    if (pastSqueezes.length === 0) return null;
    const upCount = pastSqueezes.filter((e) => e.direction === "up").length;
    const avgMove = pastSqueezes.reduce((s, e) => s + Math.abs(e.movePercent), 0) / pastSqueezes.length;
    const avgDur = pastSqueezes.reduce((s, e) => s + e.durationDays, 0) / pastSqueezes.length;
    return {
      count: pastSqueezes.length,
      upRate: Math.round((upCount / pastSqueezes.length) * 100),
      avgMove: avgMove.toFixed(1),
      avgDuration: Math.round(avgDur),
    };
  }, [pastSqueezes]);

  const color = squeezeColor(stock.bbWidthPercentile);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-text-primary">{stock.ticker}</h3>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: color }}
            >
              {squeezeLabel(stock.bbWidthPercentile)}
            </span>
            {stock.fired && (
              <span className="animate-pulse rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                FIRED!
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted">
            {stock.name} &middot; {stock.sector}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-text-primary">${stock.close.toFixed(2)}</p>
          <p className={`text-xs font-medium ${stock.changePct >= 0 ? "text-green" : "text-red"}`}>
            {stock.changePct >= 0 ? "+" : ""}
            {stock.changePct.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          {
            label: "BB Width",
            value: (stock.bbWidth * 100).toFixed(1) + "%",
            sub: `Avg: ${(stock.bbWidthAvg * 100).toFixed(1)}%`,
          },
          {
            label: "Percentile",
            value: `${stock.bbWidthPercentile}th`,
            sub: squeezeLabel(stock.bbWidthPercentile),
          },
          {
            label: "Squeeze Days",
            value: stock.squeezeDays > 0 ? `${stock.squeezeDays}d` : "\u2014",
            sub: stock.inSqueeze ? "Active" : "Inactive",
          },
          {
            label: "RSI",
            value: stock.rsi.toFixed(0),
            sub: stock.rsi < 30 ? "Oversold" : stock.rsi > 70 ? "Overbought" : "Neutral",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-bg-primary p-2.5 text-center">
            <p className="text-sm uppercase tracking-wider text-text-muted">{s.label}</p>
            <p className="mt-0.5 text-base font-bold text-text-primary">{s.value}</p>
            <p className="text-sm text-text-muted">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* BB Width Timeline */}
      <div className="rounded-xl border border-border bg-bg-primary p-4">
        <h4 className="mb-2 text-sm font-semibold text-text-primary">BB Width Timeline</h4>
        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={history} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="bbWidthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
                tickFormatter={fmtDate}
                minTickGap={50}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
                tickFormatter={(v: number) => (v * 100).toFixed(0) + "%"}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(value: number | undefined) => [((value ?? 0) * 100).toFixed(2) + "%", "BB Width"]}
                labelFormatter={(d: unknown) => fmtDate(String(d))}
              />
              <ReferenceLine
                y={threshold}
                stroke="#facc15"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "Squeeze",
                  position: "right",
                  fill: "#facc15",
                  fontSize: 9,
                }}
              />
              <Area
                type="monotone"
                dataKey="bbWidth"
                stroke={color}
                fill="url(#bbWidthGrad)"
                strokeWidth={2}
                dot={false}
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Skeleton className="h-[160px]" />
        )}
      </div>

      {/* Price + Bollinger Bands */}
      {chartLoading ? (
        <Skeleton className="h-[200px] rounded-xl" />
      ) : bollingerData.length > 0 ? (
        <div className="rounded-xl border border-border bg-bg-primary p-4">
          <h4 className="mb-2 text-sm font-semibold text-text-primary">
            Price + Bollinger Bands
          </h4>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={bollingerData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
                tickFormatter={fmtDate}
                minTickGap={50}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => "$" + v.toFixed(0)}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(value: number | undefined, name: string | undefined) => [
                  "$" + (value ?? 0).toFixed(2),
                  name === "close"
                    ? "Price"
                    : name === "bbUpper"
                      ? "BB Upper"
                      : name === "bbLower"
                        ? "BB Lower"
                        : "BB Middle",
                ]}
                labelFormatter={(d: unknown) => fmtDate(String(d))}
              />
              <Line
                type="monotone"
                dataKey="bbUpper"
                stroke="#818cf880"
                strokeDasharray="4 4"
                dot={false}
                strokeWidth={1}
              />
              <Line
                type="monotone"
                dataKey="bbLower"
                stroke="#818cf880"
                strokeDasharray="4 4"
                dot={false}
                strokeWidth={1}
              />
              <Line
                type="monotone"
                dataKey="bbMiddle"
                stroke="#818cf840"
                strokeDasharray="2 4"
                dot={false}
                strokeWidth={1}
              />
              <Line
                type="monotone"
                dataKey="close"
                stroke="var(--color-accent)"
                strokeWidth={2}
                dot={false}
                animationDuration={600}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Squeeze Track Record */}
      {squeezeStats ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-bg-primary p-4">
            <h4 className="mb-3 text-sm font-semibold text-text-primary">Squeeze Track Record</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{squeezeStats.count}</p>
                <p className="text-sm text-text-muted">Squeezes (6mo)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green">{squeezeStats.upRate}%</p>
                <p className="text-sm text-text-muted">Resolved Up</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{squeezeStats.avgMove}%</p>
                <p className="text-sm text-text-muted">Avg Move</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{squeezeStats.avgDuration}d</p>
                <p className="text-sm text-text-muted">Avg Duration</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg-primary p-4">
            <h4 className="mb-3 text-sm font-semibold text-text-primary">Recent Squeezes</h4>
            <div className="space-y-1.5">
              {pastSqueezes
                .slice(-6)
                .reverse()
                .map((ev, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-bg-secondary px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      {ev.direction === "up" ? (
                        <TrendingUp className="h-3 w-3 text-green" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red" />
                      )}
                      <span className="text-sm text-text-muted">{fmtDate(ev.fireDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-muted">{ev.durationDays}d</span>
                      <span
                        className={`text-xs font-bold ${ev.direction === "up" ? "text-green" : "text-red"}`}
                      >
                        {ev.movePercent >= 0 ? "+" : ""}
                        {ev.movePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              {pastSqueezes.length === 0 && (
                <p className="py-4 text-center text-xs text-text-muted">
                  No completed squeezes in this period
                </p>
              )}
            </div>
          </div>
        </div>
      ) : !chartLoading ? (
        <div className="rounded-xl border border-border bg-bg-primary p-6 text-center">
          <p className="text-xs text-text-muted">No squeeze events detected in the last 6 months</p>
        </div>
      ) : null}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          to={`/planner?add=${stock.ticker}`}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/80"
        >
          <ClipboardList className="h-3.5 w-3.5" /> Plan Trade
        </Link>
        <Link
          to={`/dna/${stock.ticker}`}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover"
        >
          <Dna className="h-3.5 w-3.5" /> Stock DNA
        </Link>
        <Link
          to={`/ticker/${stock.ticker}`}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Full Chart
        </Link>
        <button
          type="button"
          onClick={() => toggle(stock.ticker)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
            isWatching
              ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
              : "border-border text-text-secondary hover:bg-bg-hover"
          }`}
        >
          <Star className={`h-4 w-4 ${isWatching ? "fill-yellow-400" : ""}`} />
          {isWatching ? "Watching" : "Watch"}
        </button>
      </div>
    </div>
  );
}
