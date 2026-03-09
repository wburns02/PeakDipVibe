import type { TradePlan } from "../lib/planner";
import { Target, TrendingUp, TrendingDown, DollarSign, Shield } from "lucide-react";

interface Props {
  plans: TradePlan[];
  accountSize: number;
}

export function PlanSummary({ plans, accountSize }: Props) {
  const bullish = plans.filter((p) => p.confluence.score >= 55);
  const bearish = plans.filter((p) => p.confluence.score < 45);
  const neutral = plans.filter((p) => p.confluence.score >= 45 && p.confluence.score < 55);

  const totalRisk = plans
    .filter((p) => p.action === "Strong Buy" || p.action === "Buy Dip")
    .reduce((sum, p) => sum + p.riskDollars, 0);
  const riskPct = accountSize > 0 ? (totalRisk / accountSize) * 100 : 0;

  const avgRR = plans.length > 0
    ? plans.reduce((s, p) => s + p.riskReward, 0) / plans.length
    : 0;

  const topPick = plans[0];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl border border-border bg-bg-card p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-text-muted">
          <Target className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Setups</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-text-primary">{plans.length}</span>
          <div className="flex gap-1.5 text-xs">
            <span className="text-green">{bullish.length} bull</span>
            <span className="text-text-muted">{neutral.length} flat</span>
            <span className="text-red">{bearish.length} bear</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-bg-card p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-text-muted">
          <TrendingUp className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Top Pick</span>
        </div>
        {topPick ? (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-accent">{topPick.ticker}</span>
            <span className="text-xs text-text-muted">{topPick.opportunityScore}pts</span>
          </div>
        ) : (
          <span className="text-sm text-text-muted">--</span>
        )}
      </div>

      <div className="rounded-xl border border-border bg-bg-card p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-text-muted">
          <TrendingDown className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Avg R/R</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-text-primary">{avgRR.toFixed(1)}</span>
          <span className="text-xs text-text-muted">: 1</span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-bg-card p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-text-muted">
          <Shield className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Total Risk</span>
        </div>
        <div className="flex items-baseline gap-1">
          <DollarSign className="h-4 w-4 text-text-muted" />
          <span className="text-2xl font-bold text-text-primary">{totalRisk.toLocaleString()}</span>
          <span className={`text-xs ${riskPct > 5 ? "text-red" : "text-text-muted"}`}>
            ({riskPct.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
