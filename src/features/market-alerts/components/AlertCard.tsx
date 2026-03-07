import { Link } from "react-router-dom";
import type { MarketAlert } from "../lib/alerts";
import { ALERT_TYPE_META, ALERT_TYPE_LABELS } from "../lib/alerts";
import { useWatchlist } from "@/hooks/useWatchlist";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  ArrowDown,
  ArrowUp,
  Crosshair,
  Flame,
  Star,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

const TYPE_ICONS: Record<string, typeof TrendingUp> = {
  golden_cross: TrendingUp,
  death_cross: TrendingDown,
  oversold: ArrowDown,
  overbought: ArrowUp,
  bb_squeeze_low: Activity,
  bb_breakout_high: Zap,
  big_mover_up: Flame,
  big_mover_down: Crosshair,
  below_sma200: TrendingDown,
  above_sma200_breakout: TrendingUp,
};

const SEVERITY_BADGES: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red/15 text-red border-red/20" },
  warning: { label: "Warning", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  info: { label: "Info", className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
};

interface Props {
  alert: MarketAlert;
}

export function AlertCard({ alert }: Props) {
  const { toggle, isWatched } = useWatchlist();
  const meta = ALERT_TYPE_META[alert.type];
  const Icon = TYPE_ICONS[alert.type] ?? AlertTriangle;
  const sevBadge = SEVERITY_BADGES[alert.severity];
  const watched = isWatched(alert.ticker);

  return (
    <div
      className={`group rounded-xl border transition-all hover:shadow-md ${
        alert.isWatchlisted
          ? "border-accent/25 bg-accent/[0.03]"
          : "border-border bg-bg-card"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: meta.bgColor }}
        >
          <Icon className="h-5 w-5" style={{ color: meta.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/ticker/${alert.ticker}`}
              className="text-sm font-bold text-accent hover:underline"
            >
              {alert.ticker}
            </Link>
            <span className="truncate text-xs text-text-muted">{alert.name}</span>
            <span
              className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold"
              style={{ backgroundColor: meta.bgColor, color: meta.color }}
            >
              {ALERT_TYPE_LABELS[alert.type]}
            </span>
            <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${sevBadge.className}`}>
              {sevBadge.label}
            </span>
            {alert.isWatchlisted && (
              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-accent">
                <Star className="h-2.5 w-2.5 fill-accent" /> Watchlist
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="mt-1 text-sm font-semibold text-text-primary">{alert.title}</h3>

          {/* Description */}
          <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{alert.description}</p>

          {/* Metrics row */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
            <span className="font-mono font-semibold text-text-primary">${alert.price.toFixed(2)}</span>
            <span className={`font-mono font-semibold ${alert.changePct >= 0 ? "text-green" : "text-red"}`}>
              {alert.changePct >= 0 ? "+" : ""}{alert.changePct.toFixed(2)}%
            </span>
            <span className="text-text-muted">RSI {alert.rsi.toFixed(0)}</span>
            {alert.bbPctb != null && (
              <span className="text-text-muted">BB%B {alert.bbPctb.toFixed(2)}</span>
            )}
            <span className="text-text-muted">{alert.sector}</span>
          </div>

          {/* Actions */}
          <div className="mt-2.5 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Link
              to={`/dna/${alert.ticker}`}
              className="flex items-center gap-1 rounded-md bg-bg-secondary px-2 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              Analyze DNA <ChevronRight className="h-3 w-3" />
            </Link>
            <Link
              to={`/ticker/${alert.ticker}`}
              className="flex items-center gap-1 rounded-md bg-bg-secondary px-2 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
            >
              View Chart <ChevronRight className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={() => toggle(alert.ticker)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                watched
                  ? "bg-accent/10 text-accent"
                  : "bg-bg-secondary text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              <Star className={`h-3 w-3 ${watched ? "fill-accent" : ""}`} />
              {watched ? "Watched" : "Watch"}
            </button>
          </div>
        </div>

        {/* Right side: Change badge */}
        <div className="shrink-0 text-right">
          <div
            className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
              alert.changePct >= 0
                ? "bg-green/10 text-green"
                : "bg-red/10 text-red"
            }`}
          >
            {alert.changePct >= 0 ? "+" : ""}{alert.changePct.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}
