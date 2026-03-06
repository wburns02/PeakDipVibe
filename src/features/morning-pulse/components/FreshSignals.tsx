import { Link } from "react-router-dom";
import { Zap, ChevronRight, Volume2 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PatternSignal } from "@/api/types/signals";
import { formatPercent, formatRelativeTime } from "@/lib/formatters";
import { catalystLabel } from "../lib/scoring";

interface Props {
  signals: PatternSignal[] | undefined;
  loading?: boolean;
}

export function FreshSignals({ signals, loading }: Props) {
  if (loading) {
    return (
      <div>
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  const recent = signals?.slice(0, 8) ?? [];

  if (!recent.length) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold text-text-primary">
            Fresh Signals
          </h2>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-6 text-center">
          <Zap className="mx-auto mb-2 h-8 w-8 text-text-muted" />
          <p className="text-sm text-text-muted">
            No new pattern signals detected recently.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold text-text-primary">
            Fresh Signals
          </h2>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
            {recent.length} new
          </span>
        </div>
        <Link
          to="/signals"
          className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
        >
          All signals <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-2">
        {recent.map((s) => {
          const strength = s.signal_strength ?? 0;
          const strengthColor =
            strength >= 70
              ? "text-green"
              : strength >= 50
                ? "text-amber"
                : "text-text-muted";

          return (
            <Link
              key={`${s.ticker}-${s.signal_date}`}
              to={`/ticker/${s.ticker}`}
              className="group flex items-center gap-3 rounded-xl border border-border bg-bg-card p-3 transition-all duration-200 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
            >
              {/* Strength indicator */}
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-hover">
                <span className={`text-sm font-bold ${strengthColor}`}>
                  {strength.toFixed(0)}
                </span>
                <svg className="absolute inset-0 h-10 w-10 -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="17"
                    fill="none"
                    stroke="currentColor"
                    className="text-bg-primary"
                    strokeWidth="2"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="17"
                    fill="none"
                    stroke={
                      strength >= 70
                        ? "#22c55e"
                        : strength >= 50
                          ? "#f59e0b"
                          : "#8492a6"
                    }
                    strokeWidth="2"
                    strokeDasharray={`${(strength / 100) * 2 * Math.PI * 17} ${2 * Math.PI * 17}`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-accent">{s.ticker}</span>
                  {s.name && (
                    <span className="truncate text-xs text-text-muted">
                      {s.name}
                    </span>
                  )}
                  {s.catalyst_type && (
                    <span className="rounded bg-bg-hover px-1.5 py-0.5 text-[10px] text-text-muted">
                      {catalystLabel(s.catalyst_type)}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-[11px] text-text-muted">
                  {s.gap_up_pct != null && (
                    <span
                      className={
                        s.gap_up_pct >= 0 ? "text-green" : "text-red"
                      }
                    >
                      Gap {formatPercent(s.gap_up_pct)}
                    </span>
                  )}
                  {s.volume_ratio != null && (
                    <span className="flex items-center gap-0.5">
                      <Volume2 className="h-3 w-3" />
                      {s.volume_ratio.toFixed(1)}x
                    </span>
                  )}
                  {s.sector && <span>{s.sector}</span>}
                </div>
              </div>

              {/* Time + outcome */}
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-text-muted">
                  {formatRelativeTime(s.signal_date)}
                </p>
                {s.outcome_1d != null && (
                  <p
                    className={`text-xs font-semibold ${s.outcome_1d >= 0 ? "text-green" : "text-red"}`}
                  >
                    {formatPercent(s.outcome_1d)} 1d
                  </p>
                )}
              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
