import type { PerformanceStats as Stats } from "../lib/journal";
import {
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  Zap,
  Calendar,
  BarChart3,
  Flame,
} from "lucide-react";

interface Props {
  stats: Stats;
}

export function PerformanceStats({ stats }: Props) {
  if (stats.closedTrades === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">Performance Analytics</h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Target className="h-3.5 w-3.5" />}
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          color={stats.winRate >= 50 ? "text-green" : "text-red"}
        />
        <StatCard
          icon={<BarChart3 className="h-3.5 w-3.5" />}
          label="Profit Factor"
          value={stats.profitFactor === Infinity ? "Perfect" : stats.profitFactor.toFixed(2)}
          color={stats.profitFactor >= 1 ? "text-green" : "text-red"}
        />
        <StatCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Avg Win"
          value={`$${stats.avgWin.toFixed(0)}`}
          color="text-green"
        />
        <StatCard
          icon={<TrendingDown className="h-3.5 w-3.5" />}
          label="Avg Loss"
          value={`-$${stats.avgLoss.toFixed(0)}`}
          color="text-red"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Trophy className="h-3.5 w-3.5" />}
          label="Best Trade"
          value={stats.bestTrade ? `${stats.bestTrade.ticker} +$${stats.bestTrade.pnl.toFixed(0)}` : "--"}
          color="text-green"
        />
        <StatCard
          icon={<TrendingDown className="h-3.5 w-3.5" />}
          label="Worst Trade"
          value={stats.worstTrade ? `${stats.worstTrade.ticker} -$${Math.abs(stats.worstTrade.pnl).toFixed(0)}` : "--"}
          color="text-red"
        />
        <StatCard
          icon={<Calendar className="h-3.5 w-3.5" />}
          label="Avg Hold"
          value={`${stats.avgHoldDays.toFixed(0)} days`}
          color="text-text-primary"
        />
        <StatCard
          icon={<Flame className="h-3.5 w-3.5" />}
          label="Streak"
          value={
            stats.currentStreak > 0
              ? `${stats.currentStreak}W`
              : stats.currentStreak < 0
              ? `${Math.abs(stats.currentStreak)}L`
              : "0"
          }
          color={stats.currentStreak > 0 ? "text-green" : stats.currentStreak < 0 ? "text-red" : "text-text-muted"}
          sub={`Best: ${stats.winStreak}W`}
        />
      </div>

      {/* Win rate bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-text-muted">
            {stats.closedTrades} closed trades
          </span>
          <span className="text-text-muted">
            <Zap className="inline h-3 w-3 text-accent" /> {stats.openTrades} open
          </span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-bg-hover">
          <div
            className="bg-green transition-all duration-500"
            style={{ width: `${stats.winRate}%` }}
          />
          <div
            className="bg-red transition-all duration-500"
            style={{ width: `${100 - stats.winRate}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-text-muted">
          <span className="text-green">
            {Math.round((stats.winRate / 100) * stats.closedTrades)} wins
          </span>
          <span className="text-red">
            {stats.closedTrades - Math.round((stats.winRate / 100) * stats.closedTrades)} losses
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-bg-secondary p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-text-muted">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-text-muted">{sub}</p>}
    </div>
  );
}
