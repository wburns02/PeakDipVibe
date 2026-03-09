import type { RiskProfile } from "../lib/confluence";
import { Shield, Target, AlertTriangle } from "lucide-react";

interface Props {
  risk: RiskProfile;
  price: number;
}

export function RiskCard({ risk, price }: Props) {
  const volColor =
    risk.volatilityLabel === "High" ? "text-red" :
    risk.volatilityLabel === "Moderate" ? "text-amber" : "text-green";
  const volBg =
    risk.volatilityLabel === "High" ? "bg-red/10" :
    risk.volatilityLabel === "Moderate" ? "bg-amber/10" : "bg-green/10";

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Risk Assessment</h3>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${volBg}`}>
          <AlertTriangle className={`h-3 w-3 ${volColor}`} />
          <span className={`text-xs font-semibold ${volColor}`}>{risk.volatilityLabel} Volatility</span>
        </div>
      </div>

      {/* Price levels */}
      <div className="relative">
        {/* Visual bar */}
        <div className="flex h-10 items-center rounded-lg bg-bg-secondary overflow-hidden">
          {/* Stop zone */}
          <div
            className="h-full bg-red/10 flex items-center justify-center"
            style={{ width: `${((price - risk.suggestedStop) / (risk.suggestedTarget - risk.suggestedStop)) * 100}%` }}
          >
            <span className="text-xs font-medium text-red">Risk</span>
          </div>
          {/* Reward zone */}
          <div className="h-full flex-1 bg-green/10 flex items-center justify-center">
            <span className="text-xs font-medium text-green">Reward</span>
          </div>
        </div>
        {/* Current price marker */}
        <div
          className="absolute top-0 h-10 w-0.5 bg-accent"
          style={{
            left: `${((price - risk.suggestedStop) / (risk.suggestedTarget - risk.suggestedStop)) * 100}%`,
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-red/5 border border-red/10 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Shield className="h-3 w-3 text-red" />
            <span className="text-xs font-semibold uppercase tracking-wider text-red">Stop</span>
          </div>
          <p className="font-mono text-sm font-bold text-red">${risk.suggestedStop.toFixed(2)}</p>
          <p className="text-xs text-text-muted">-{((1 - risk.suggestedStop / price) * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-lg bg-accent/5 border border-accent/10 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">Current</span>
          </div>
          <p className="font-mono text-sm font-bold text-accent">${price.toFixed(2)}</p>
          <p className="text-xs text-text-muted">ATR: ${risk.atr.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-green/5 border border-green/10 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="h-3 w-3 text-green" />
            <span className="text-xs font-semibold uppercase tracking-wider text-green">Target</span>
          </div>
          <p className="font-mono text-sm font-bold text-green">${risk.suggestedTarget.toFixed(2)}</p>
          <p className="text-xs text-text-muted">+{((risk.suggestedTarget / price - 1) * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>Support: <span className="font-mono text-text-secondary">${risk.support.toFixed(2)}</span></span>
        <span>R/R Ratio: <span className={`font-mono font-semibold ${risk.riskRewardRatio >= 1.5 ? "text-green" : "text-amber"}`}>{risk.riskRewardRatio.toFixed(1)}:1</span></span>
        <span>Resistance: <span className="font-mono text-text-secondary">${risk.resistance.toFixed(2)}</span></span>
      </div>
    </div>
  );
}
