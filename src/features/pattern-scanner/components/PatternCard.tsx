import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  ClipboardList,
  Dna,
  ExternalLink,
  Star,
  Target,
  ShieldAlert,
} from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import type { DetectedPattern } from "../lib/pattern-engine";
import { patternColor } from "../lib/pattern-engine";
import { PatternChart } from "./PatternChart";

interface Props {
  pattern: DetectedPattern;
}

export function PatternCard({ pattern: p }: Props) {
  const { watchlist, toggle } = useWatchlist();
  const isWatching = watchlist.includes(p.ticker);
  const color = patternColor(p.type);
  const isBull = p.type === "bullish";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              isBull ? "bg-green-500/10" : "bg-red-500/10"
            }`}
          >
            {isBull ? (
              <TrendingUp className="h-4 w-4 text-green" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link
                to={`/ticker/${p.ticker}`}
                className="text-sm font-bold text-text-primary hover:text-accent transition-colors"
              >
                {p.ticker}
              </Link>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {p.label}
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              {p.name} &middot; {p.sector}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-text-primary">${p.entryPrice.toFixed(2)}</p>
          <div className="flex items-center gap-0.5 justify-end">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: i < p.conviction ? color : "var(--color-text-muted)",
                  opacity: i < p.conviction ? 1 : 0.15,
                }}
              />
            ))}
            <span className="ml-1 text-[11px] text-text-muted">{p.conviction}/5</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-3 py-2">
        <PatternChart pattern={p} />
      </div>

      {/* Trade levels */}
      <div className="grid grid-cols-4 gap-px border-t border-border bg-border">
        <div className="bg-bg-secondary px-2 py-2 text-center">
          <p className="text-[11px] uppercase tracking-wider text-text-muted">Target</p>
          <p className="flex items-center justify-center gap-0.5">
            <Target className="h-2.5 w-2.5 text-green" />
            <span className="text-xs font-bold text-green">${p.targetPrice.toFixed(2)}</span>
          </p>
        </div>
        <div className="bg-bg-secondary px-2 py-2 text-center">
          <p className="text-[11px] uppercase tracking-wider text-text-muted">Stop</p>
          <p className="flex items-center justify-center gap-0.5">
            <ShieldAlert className="h-2.5 w-2.5 text-red" />
            <span className="text-xs font-bold text-red">${p.stopPrice.toFixed(2)}</span>
          </p>
        </div>
        <div className="bg-bg-secondary px-2 py-2 text-center">
          <p className="text-[11px] uppercase tracking-wider text-text-muted">Potential</p>
          <p className={`text-xs font-bold ${isBull ? "text-green" : "text-red"}`}>
            {isBull ? "+" : "-"}{p.potentialPct.toFixed(1)}%
          </p>
        </div>
        <div className="bg-bg-secondary px-2 py-2 text-center">
          <p className="text-[11px] uppercase tracking-wider text-text-muted">R:R</p>
          <p className="text-xs font-bold text-accent">
            {p.riskReward.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 border-t border-border px-3 py-2">
        <Link
          to={`/planner?add=${p.ticker}`}
          className="flex items-center gap-1 rounded-md bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
        >
          <ClipboardList className="h-3.5 w-3.5" /> Plan Trade
        </Link>
        <Link
          to={`/dna/${p.ticker}`}
          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          <Dna className="h-3.5 w-3.5" /> DNA
        </Link>
        <Link
          to={`/ticker/${p.ticker}`}
          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Chart
        </Link>
        <button
          type="button"
          onClick={() => toggle(p.ticker)}
          className={`ml-auto flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
            isWatching
              ? "text-yellow-400"
              : "text-text-muted hover:bg-bg-hover hover:text-text-primary"
          }`}
        >
          <Star className={`h-4 w-4 ${isWatching ? "fill-yellow-400" : ""}`} />
        </button>
      </div>
    </div>
  );
}
