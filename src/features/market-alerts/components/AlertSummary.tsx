import type { MarketAlert, AlertType } from "../lib/alerts";
import { ALERT_TYPE_META, ALERT_TYPE_LABELS, getAlertSummary } from "../lib/alerts";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  ArrowDown,
  ArrowUp,
  Crosshair,
  Flame,
} from "lucide-react";

const TYPE_ICONS: Partial<Record<AlertType, typeof TrendingUp>> = {
  golden_cross: TrendingUp,
  death_cross: TrendingDown,
  oversold: ArrowDown,
  overbought: ArrowUp,
  bb_squeeze_low: Activity,
  bb_breakout_high: Zap,
  big_mover_up: Flame,
  big_mover_down: Crosshair,
};

interface Props {
  alerts: MarketAlert[];
  activeFilter: AlertType | null;
  onFilterToggle: (type: AlertType | null) => void;
}

export function AlertSummary({ alerts, activeFilter, onFilterToggle }: Props) {
  const counts = getAlertSummary(alerts);
  const watchlistCount = alerts.filter((a) => a.isWatchlisted).length;

  // Show the most interesting types
  const displayTypes: AlertType[] = [
    "golden_cross", "death_cross", "oversold", "overbought",
    "bb_squeeze_low", "big_mover_up", "big_mover_down",
  ];

  return (
    <div className="space-y-3">
      {/* Top stats row */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => onFilterToggle(null)}
          className={`rounded-xl border p-3 text-left transition-all ${
            activeFilter === null
              ? "border-accent/40 bg-accent/10"
              : "border-border bg-bg-card hover:border-border"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Total Alerts</p>
          <p className="text-2xl font-bold text-text-primary">{alerts.length}</p>
        </button>
        <div className="rounded-xl border border-border bg-bg-card p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Watchlist Hits</p>
          <p className="text-2xl font-bold text-accent">{watchlistCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Critical</p>
          <p className="text-2xl font-bold text-red">
            {alerts.filter((a) => a.severity === "critical").length}
          </p>
        </div>
      </div>

      {/* Alert type pills */}
      <div className="flex flex-wrap gap-2">
        {displayTypes.map((type) => {
          const count = counts[type] ?? 0;
          if (count === 0) return null;
          const meta = ALERT_TYPE_META[type];
          const Icon = TYPE_ICONS[type] ?? Activity;
          const isActive = activeFilter === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => onFilterToggle(isActive ? null : type)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "border-transparent shadow-sm"
                  : "border-border bg-bg-card hover:border-border"
              }`}
              style={isActive ? { backgroundColor: meta.bgColor, borderColor: meta.color + "40", color: meta.color } : {}}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
              <span className={isActive ? "" : "text-text-secondary"}>{ALERT_TYPE_LABELS[type]}</span>
              <span
                className="ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: meta.color + "20", color: meta.color }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
