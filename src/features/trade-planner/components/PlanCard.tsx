import { useState } from "react";
import { Link } from "react-router-dom";
import type { TradePlan, TradeAction } from "../lib/planner";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Dna,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface Props {
  plan: TradePlan;
  rank: number;
}

const ACTION_STYLES: Record<TradeAction, { bg: string; text: string; border: string }> = {
  "Strong Buy": { bg: "bg-green/10", text: "text-green", border: "border-green/30" },
  "Buy Dip": { bg: "bg-green/5", text: "text-green", border: "border-green/20" },
  "Watch Long": { bg: "bg-accent/5", text: "text-accent", border: "border-accent/20" },
  "Neutral": { bg: "bg-bg-secondary", text: "text-text-muted", border: "border-border" },
  "Watch Short": { bg: "bg-amber/5", text: "text-amber", border: "border-amber/20" },
  "Reduce": { bg: "bg-red/5", text: "text-red", border: "border-red/20" },
  "Avoid": { bg: "bg-red/10", text: "text-red", border: "border-red/30" },
};

function BiasIcon({ score }: { score: number }) {
  if (score >= 55) return <TrendingUp className="h-3.5 w-3.5 text-green" />;
  if (score < 45) return <TrendingDown className="h-3.5 w-3.5 text-red" />;
  return <Minus className="h-3.5 w-3.5 text-text-muted" />;
}

function PriceLadder({ plan }: { plan: TradePlan }) {
  const { stop, entry, targets, price } = plan;
  const range = targets[2] - stop;
  if (range <= 0) return null;

  const pct = (val: number) => ((val - stop) / range) * 100;
  const levels = [
    { label: "Stop", value: stop, color: "bg-red", pct: pct(stop) },
    { label: "Entry", value: entry, color: "bg-accent", pct: pct(entry) },
    { label: "T1", value: targets[0], color: "bg-green/60", pct: pct(targets[0]) },
    { label: "T2", value: targets[1], color: "bg-green/80", pct: pct(targets[1]) },
    { label: "T3", value: targets[2], color: "bg-green", pct: pct(targets[2]) },
  ];
  const pricePct = Math.max(0, Math.min(100, pct(price)));

  return (
    <div className="space-y-2">
      <div className="relative h-2 rounded-full bg-bg-hover overflow-hidden">
        {/* Risk zone (stop to entry) */}
        <div
          className="absolute inset-y-0 bg-red/20 rounded-l-full"
          style={{ left: `${pct(stop)}%`, width: `${pct(entry) - pct(stop)}%` }}
        />
        {/* Reward zone (entry to T3) */}
        <div
          className="absolute inset-y-0 bg-green/15 rounded-r-full"
          style={{ left: `${pct(entry)}%`, width: `${pct(targets[2]) - pct(entry)}%` }}
        />
        {/* Current price marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3.5 w-0.5 bg-text-primary rounded-full"
          style={{ left: `${pricePct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px]">
        {levels.map((l) => (
          <div key={l.label} className="flex flex-col items-center gap-0.5">
            <div className={`h-1.5 w-1.5 rounded-full ${l.color}`} />
            <span className="text-text-muted">{l.label}</span>
            <span className="font-mono font-medium text-text-secondary">${l.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlanCard({ plan, rank }: Props) {
  const [expanded, setExpanded] = useState(false);
  const style = ACTION_STYLES[plan.action];

  return (
    <div
      className={`rounded-2xl border ${style.border} bg-bg-card transition-all hover:shadow-md`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {/* Rank badge */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-secondary text-sm font-bold text-text-muted">
          {rank}
        </div>

        {/* Ticker + info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-text-primary">{plan.ticker}</span>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
              {plan.action}
            </span>
            <BiasIcon score={plan.confluence.score} />
          </div>
          <p className="truncate text-xs text-text-muted">{plan.name} &middot; {plan.sector}</p>
        </div>

        {/* Score + price */}
        <div className="flex shrink-0 items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-sm font-bold text-text-primary">
              ${plan.price.toFixed(2)}
            </div>
            <div className={`text-[11px] font-medium ${plan.changePct >= 0 ? "text-green" : "text-red"}`}>
              {plan.changePct >= 0 ? "+" : ""}{plan.changePct.toFixed(2)}%
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
              style={{
                backgroundColor: plan.confluence.verdictColor + "18",
                color: plan.confluence.verdictColor,
              }}
            >
              {plan.opportunityScore}
            </div>
            <span className="text-[11px] text-text-muted mt-0.5">score</span>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4 animate-slideDown">
          {/* Reasoning */}
          <p className="text-sm leading-relaxed text-text-secondary">{plan.reasoning}</p>

          {/* Price ladder */}
          <PriceLadder plan={plan} />

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Risk/Share" value={`$${plan.riskPerShare.toFixed(2)}`} />
            <Stat label="R/R Ratio" value={`${plan.riskReward.toFixed(1)} : 1`} />
            <Stat label="Position" value={`${plan.positionShares} shares`} />
            <Stat label="Capital" value={`$${plan.positionDollars.toLocaleString()}`} />
          </div>

          {/* Signal pills */}
          <div className="flex flex-wrap gap-1.5">
            {plan.confluence.signals.slice(0, 6).map((s) => (
              <span
                key={s.name}
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                  s.bias === "bullish"
                    ? "bg-green/10 text-green"
                    : s.bias === "bearish"
                    ? "bg-red/10 text-red"
                    : "bg-bg-secondary text-text-muted"
                }`}
              >
                {s.name}: {s.value}
              </span>
            ))}
          </div>

          {/* Links */}
          <div className="flex gap-2 pt-1">
            <Link
              to={`/dna/${plan.ticker}`}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent/30 hover:text-accent"
            >
              <Dna className="h-3 w-3" />
              Full DNA
            </Link>
            <Link
              to={`/ticker/${plan.ticker}`}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent/30 hover:text-accent"
            >
              <ExternalLink className="h-3 w-3" />
              Detail
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-bg-secondary px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <p className="text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}
