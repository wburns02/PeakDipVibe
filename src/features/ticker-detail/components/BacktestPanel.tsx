import { useState } from "react";
import { FlaskConical, TrendingUp, Target, AlertTriangle } from "lucide-react";
import { useBacktest } from "@/api/hooks/useCompare";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPercent } from "@/lib/formatters";

interface BacktestPanelProps {
  ticker: string;
}

const HOLD_OPTIONS = [5, 10, 20, 30];

export function BacktestPanel({ ticker }: BacktestPanelProps) {
  const [holdDays, setHoldDays] = useState(20);
  const [threshold, setThreshold] = useState(30);
  const [direction, setDirection] = useState<"below" | "above">("below");

  const { data, isLoading } = useBacktest(ticker, {
    indicator: "RSI_14",
    threshold,
    direction,
    hold_days: holdDays,
  });

  return (
    <Card
      title="Signal Backtest"
      subtitle={`What if you ${direction === "below" ? "bought the dip" : "sold the top"}?`}
      action={
        <FlaskConical className="h-4 w-4 text-accent" />
      }
    >
      {/* Controls */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div>
          <label className="mb-1 block text-[10px] text-text-muted">Signal</label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => { setDirection("below"); setThreshold(30); }}
              className={`rounded-md px-2 py-1 text-xs ${
                direction === "below" ? "bg-green/15 text-green" : "text-text-muted hover:bg-bg-hover"
              }`}
            >
              RSI &lt; 30
            </button>
            <button
              type="button"
              onClick={() => { setDirection("above"); setThreshold(70); }}
              className={`rounded-md px-2 py-1 text-xs ${
                direction === "above" ? "bg-red/15 text-red" : "text-text-muted hover:bg-bg-hover"
              }`}
            >
              RSI &gt; 70
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-text-muted">Hold Period</label>
          <div className="flex gap-1">
            {HOLD_OPTIONS.map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setHoldDays(d)}
                className={`rounded-md px-2 py-1 text-xs ${
                  holdDays === d ? "bg-accent/15 text-accent" : "text-text-muted hover:bg-bg-hover"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : !data || data.summary.total_signals === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">
          No signals found for RSI {direction === "below" ? "<" : ">"} {threshold} on {ticker}
        </p>
      ) : (
        <>
          {/* Summary stats */}
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-bg-primary p-3 text-center">
              <Target className="mx-auto mb-1 h-4 w-4 text-accent" />
              <p className="text-lg font-bold text-text-primary">{data.summary.win_rate}%</p>
              <p className="text-[10px] text-text-muted">Win Rate</p>
            </div>
            <div className="rounded-lg bg-bg-primary p-3 text-center">
              <TrendingUp className="mx-auto mb-1 h-4 w-4 text-green" />
              <p className={`text-lg font-bold ${data.summary.avg_return >= 0 ? "text-green" : "text-red"}`}>
                {data.summary.avg_return > 0 ? "+" : ""}
                {data.summary.avg_return}%
              </p>
              <p className="text-[10px] text-text-muted">Avg Return</p>
            </div>
            <div className="rounded-lg bg-bg-primary p-3 text-center">
              <AlertTriangle className="mx-auto mb-1 h-4 w-4 text-amber" />
              <p className="text-lg font-bold text-text-primary">{data.summary.avg_drawdown}%</p>
              <p className="text-[10px] text-text-muted">Avg Drawdown</p>
            </div>
          </div>

          <p className="mb-2 text-xs text-text-muted">
            {data.summary.total_signals} signals since 2019 — Best: {formatPercent(data.summary.best_return)} / Worst: {formatPercent(data.summary.worst_return)}
          </p>

          {/* Recent signals table */}
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <caption className="sr-only">Historical backtest signals with RSI, return, and drawdown data</caption>
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th scope="col" className="pb-1 text-left">Date</th>
                  <th scope="col" className="pb-1 text-right">RSI</th>
                  <th scope="col" className="pb-1 text-right">Return</th>
                  <th scope="col" className="pb-1 text-right">Drawdown</th>
                </tr>
              </thead>
              <tbody>
                {data.signals.map((s) => (
                  <tr key={s.date} className="border-b border-border/30">
                    <td className="py-1 text-text-secondary">{s.date}</td>
                    <td className="py-1 text-right text-text-primary">{s.indicator_value}</td>
                    <td className="py-1 text-right">
                      <span className={s.return_pct >= 0 ? "text-green" : "text-red"}>
                        {s.return_pct > 0 ? "+" : ""}
                        {s.return_pct}%
                      </span>
                    </td>
                    <td className="py-1 text-right text-amber">{s.max_drawdown}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
