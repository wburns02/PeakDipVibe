import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  TrendingUp,
  Volume2,
  RotateCcw,
  Zap,
  ChevronRight,
  PlayCircle,
  Plus,
  Eye,
  Target,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWatchlist } from "@/hooks/useWatchlist";
import type { PatternSignal } from "@/api/types/signals";
import type { SectorPerformance } from "@/api/types/market";
import { computeSetupScore, catalystLabel } from "../lib/scoring";
import { formatPercent, formatRelativeTime } from "@/lib/formatters";

interface Props {
  signals: PatternSignal[] | undefined;
  sectors: SectorPerformance[] | undefined;
  loading?: boolean;
}

export function TopSetups({ signals, sectors, loading }: Props) {
  const { toggle, isWatched } = useWatchlist();

  const sectorMap = useMemo(() => {
    const map = new Map<string, number>();
    sectors?.forEach((s) => map.set(s.sector, s.avg_change_pct));
    return map;
  }, [sectors]);

  const scoredSetups = useMemo(() => {
    if (!signals?.length) return [];
    return signals
      .map((signal) => {
        const sectorPerf = sectorMap.get(signal.sector ?? "") ?? 0;
        const score = computeSetupScore(signal, sectorPerf);
        return { signal, ...score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [signals, sectorMap]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-16" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
    );
  }

  if (!scoredSetups.length) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
        <Target className="mx-auto mb-3 h-10 w-10 text-text-muted" />
        <h3 className="mb-1 text-sm font-semibold text-text-primary">
          No Active Setups
        </h3>
        <p className="text-xs text-text-muted">
          No high-conviction patterns detected in the last 7 days. Check back
          soon or{" "}
          <Link to="/signals" className="text-accent hover:underline">
            browse all signals
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold text-text-primary">
            Today's Top Setups
          </h2>
        </div>
        <Link
          to="/signals"
          className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-accent hover:bg-accent/10"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {scoredSetups.map((setup, i) => {
          const s = setup.signal;
          const watched = isWatched(s.ticker);
          return (
            <div
              key={`${s.ticker}-${s.signal_date}`}
              className="group relative overflow-hidden rounded-xl border border-border bg-bg-card transition-all duration-200 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Rank badge */}
              <div className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-br-xl bg-accent/10 text-xs font-bold text-accent">
                #{i + 1}
              </div>

              <div className="p-4 pl-10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {/* Ticker + name + catalyst */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/ticker/${s.ticker}`}
                        className="text-base font-bold text-accent hover:text-accent-hover"
                      >
                        {s.ticker}
                      </Link>
                      {s.name && (
                        <span className="truncate text-sm text-text-secondary">
                          {s.name}
                        </span>
                      )}
                    </div>

                    {/* Star rating */}
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star
                            key={j}
                            className={`h-3.5 w-3.5 ${
                              j < setup.stars
                                ? "fill-amber-400 text-amber-400"
                                : "text-bg-hover"
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          color: setup.labelColor,
                          backgroundColor: `${setup.labelColor}15`,
                        }}
                      >
                        {setup.label}
                      </span>
                      <span className="text-xs text-text-muted">
                        Score: {setup.score}
                      </span>
                    </div>
                  </div>

                  {/* Signal date */}
                  <span className="shrink-0 text-xs text-text-muted">
                    {formatRelativeTime(s.signal_date)}
                  </span>
                </div>

                {/* Catalyst headline */}
                {s.catalyst_headline && (
                  <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                    <Zap className="mr-1 inline h-3 w-3 text-amber-400" />
                    {s.catalyst_headline}
                  </p>
                )}

                {/* Metrics row */}
                <div className="mt-3 flex flex-wrap gap-3">
                  {s.gap_up_pct != null && (
                    <MetricPill
                      icon={TrendingUp}
                      label="Gap"
                      value={formatPercent(s.gap_up_pct)}
                      positive={s.gap_up_pct > 0}
                    />
                  )}
                  {s.volume_ratio != null && (
                    <MetricPill
                      icon={Volume2}
                      label="Volume"
                      value={`${s.volume_ratio.toFixed(1)}x`}
                      positive={s.volume_ratio >= 1.5}
                    />
                  )}
                  {s.recovery_pct != null && (
                    <MetricPill
                      icon={RotateCcw}
                      label="Recovery"
                      value={formatPercent(s.recovery_pct)}
                      positive={s.recovery_pct > 0}
                    />
                  )}
                  {s.catalyst_type && (
                    <div className="flex items-center gap-1 rounded-md bg-bg-hover px-2 py-1 text-xs text-text-muted">
                      <Zap className="h-3 w-3" />
                      {catalystLabel(s.catalyst_type)}
                    </div>
                  )}
                  {s.sector && (
                    <div className="flex items-center gap-1 rounded-md bg-bg-hover px-2 py-1 text-xs text-text-muted">
                      {s.sector}
                      {sectorMap.has(s.sector) && (
                        <span
                          className={`font-medium ${(sectorMap.get(s.sector) ?? 0) >= 0 ? "text-green" : "text-red"}`}
                        >
                          {formatPercent(sectorMap.get(s.sector) ?? 0)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Reasons */}
                {setup.reasons.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {setup.reasons.map((r) => (
                      <span
                        key={r}
                        className="rounded-md border border-accent/20 bg-accent/5 px-2 py-0.5 text-xs font-medium text-accent"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  <Link
                    to={`/ticker/${s.ticker}`}
                    className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
                  >
                    <Eye className="h-3 w-3" />
                    View Chart
                  </Link>
                  <Link
                    to={`/simulator?ticker=${s.ticker}&date=${s.signal_date}`}
                    className="flex items-center gap-1.5 rounded-lg bg-bg-hover px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-accent/10 hover:text-accent"
                  >
                    <PlayCircle className="h-3 w-3" />
                    Simulate
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggle(s.ticker)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      watched
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-bg-hover text-text-secondary hover:bg-amber-500/10 hover:text-amber-400"
                    }`}
                  >
                    {watched ? (
                      <Star className="h-3 w-3 fill-amber-400" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    {watched ? "Watching" : "Watchlist"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
  positive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
        positive ? "bg-green/10 text-green" : "bg-red/10 text-red"
      }`}
    >
      <Icon className="h-3 w-3" />
      <span className="text-text-muted">{label}</span>
      {value}
    </div>
  );
}
