import { Link } from "react-router-dom";
import { CalendarDays, TrendingUp } from "lucide-react";
import type { Prediction } from "@/api/types/tracker";

function probColor(score: number) {
  if (score >= 75) return "#22c55e";
  if (score >= 55) return "#4ade80";
  if (score >= 40) return "#f59e0b";
  return "#94a3b8";
}

export function PredictionCard({ prediction: p }: { prediction: Prediction }) {
  const color = probColor(p.dip_probability);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-card p-4">
      <div className="flex-shrink-0 text-center">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full text-base font-bold"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {p.dip_probability}
        </div>
        <div className="mt-0.5 text-[9px] text-text-muted">dip prob</div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            to={`/ticker/${p.ticker}`}
            className="font-bold text-accent hover:underline"
          >
            {p.ticker}
          </Link>
          <span className="truncate text-sm text-text-muted">{p.name}</span>
          <span className="ml-auto flex items-center gap-1 text-xs text-text-muted">
            <CalendarDays className="h-3 w-3" />
            {p.earnings_date}
            {p.days_until <= 3 && (
              <span className="rounded bg-amber/20 px-1 py-0.5 text-[10px] font-semibold text-amber">
                {p.days_until}d
              </span>
            )}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
          {p.historical_events > 0 && (
            <span>
              Past dips: <strong>{p.historical_events}</strong>
            </span>
          )}
          {p.historical_win_rate != null && (
            <span>
              Win rate:{" "}
              <strong
                className={
                  p.historical_win_rate >= 55
                    ? "text-green"
                    : "text-text-primary"
                }
              >
                {p.historical_win_rate.toFixed(0)}%
              </strong>
            </span>
          )}
          {p.avg_gap_pct != null && (
            <span>
              Avg gap: <strong>+{p.avg_gap_pct.toFixed(1)}%</strong>
            </span>
          )}
          {p.sector && <span className="text-text-muted">{p.sector}</span>}
        </div>

        {p.strategy && (
          <div className="mt-1.5 text-[11px] text-accent/80">
            <TrendingUp className="mr-1 inline h-3 w-3" />
            {p.strategy}
          </div>
        )}
      </div>
    </div>
  );
}
