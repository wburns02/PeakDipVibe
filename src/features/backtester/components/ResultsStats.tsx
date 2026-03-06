import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Clock,
  Shield,
  Zap,
  Activity,
} from "lucide-react";
import type { BacktestResult } from "../lib/backtest-engine";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}

function StatCard({ icon, label, value, sub, positive }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-3">
      <div className="mb-1 flex items-center gap-2 text-text-muted">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p
        className={`text-xl font-bold ${
          positive === undefined
            ? "text-text-primary"
            : positive
              ? "text-green"
              : "text-red"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-text-muted">{sub}</p>}
    </div>
  );
}

export function ResultsStats({ result }: { result: BacktestResult }) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
      <StatCard
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        label="Total Return"
        value={`${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn}%`}
        sub={`CAGR: ${result.cagr}%`}
        positive={result.totalReturn >= 0}
      />
      <StatCard
        icon={<Target className="h-3.5 w-3.5" />}
        label="Win Rate"
        value={`${result.winRate}%`}
        sub={`${result.trades.length} trades`}
        positive={result.winRate >= 50}
      />
      <StatCard
        icon={<BarChart3 className="h-3.5 w-3.5" />}
        label="Avg Trade"
        value={`${result.avgReturn >= 0 ? "+" : ""}${result.avgReturn}%`}
        sub={`Win: +${result.avgWin}% / Loss: -${result.avgLoss}%`}
        positive={result.avgReturn >= 0}
      />
      <StatCard
        icon={<TrendingDown className="h-3.5 w-3.5" />}
        label="Max Drawdown"
        value={`-${result.maxDrawdown}%`}
        positive={result.maxDrawdown < 10}
      />
      <StatCard
        icon={<Zap className="h-3.5 w-3.5" />}
        label="Profit Factor"
        value={`${result.profitFactor === Infinity ? "---" : result.profitFactor.toFixed(2)}`}
        sub={result.profitFactor >= 1.5 ? "Healthy" : result.profitFactor >= 1 ? "Marginal" : "Unprofitable"}
        positive={result.profitFactor >= 1.5}
      />
      <StatCard
        icon={<Activity className="h-3.5 w-3.5" />}
        label="Sharpe Ratio"
        value={result.sharpeRatio.toFixed(2)}
        sub={result.sharpeRatio >= 1 ? "Good risk-adjusted" : "Below target"}
        positive={result.sharpeRatio >= 1}
      />
      <StatCard
        icon={<Clock className="h-3.5 w-3.5" />}
        label="Avg Hold"
        value={`${result.avgHoldDays} days`}
      />
      <StatCard
        icon={<Shield className="h-3.5 w-3.5" />}
        label="Risk/Reward"
        value={
          result.avgLoss > 0
            ? (result.avgWin / result.avgLoss).toFixed(2)
            : "---"
        }
        sub={result.avgLoss > 0 && result.avgWin / result.avgLoss >= 2 ? "Favorable" : "Review sizing"}
        positive={result.avgLoss > 0 ? result.avgWin / result.avgLoss >= 1.5 : undefined}
      />
    </div>
  );
}
