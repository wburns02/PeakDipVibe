import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Dna, ClipboardList, Star, ArrowUpRight } from "lucide-react";
import { useChartData } from "@/api/hooks/usePrices";
import { useWatchlist } from "@/hooks/useWatchlist";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TradeIdea } from "../lib/idea-engine";
import { setupColor, buildChartLevels } from "../lib/idea-engine";
import { SetupChart } from "./SetupChart";

interface Props {
  idea: TradeIdea;
}

export function IdeaCard({ idea }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { watchlist, add, remove } = useWatchlist();
  const isWatching = watchlist.includes(idea.ticker);

  const { data: chartData, isLoading: chartLoading } = useChartData(
    expanded ? idea.ticker : "",
    { limit: 50 },
  );

  const levels = chartData ? buildChartLevels(chartData, idea) : null;
  const color = setupColor(idea.setup);
  const stars = Array.from({ length: 5 }, (_, i) => i < Math.min(idea.conviction, 5));

  return (
    <div className="rounded-2xl border border-border bg-bg-secondary transition-shadow hover:shadow-lg">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        {/* Setup badge */}
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-[10px] font-bold"
          style={{ backgroundColor: color }}
        >
          {idea.direction === "Long" ? "L" : "S"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: color + "20", color }}
            >
              {idea.setup}
            </span>
            <span className="rounded-full bg-bg-hover px-2 py-0.5 text-[10px] text-text-muted">
              {idea.timeframe}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Link
              to={`/ticker/${idea.ticker}`}
              onClick={(e) => e.stopPropagation()}
              className="text-lg font-bold text-accent hover:underline"
            >
              {idea.ticker}
            </Link>
            <span className="truncate text-sm text-text-muted">{idea.name}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-text-muted">
            <span>{idea.sector}</span>
            <span className="flex items-center gap-0.5">
              {stars.map((filled, i) => (
                <span key={i} className={filled ? "text-yellow-400" : "text-text-muted/30"}>
                  ★
                </span>
              ))}
            </span>
          </div>
        </div>

        {/* R/R summary */}
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-green">{idea.riskReward}:1</p>
          <p className="text-[10px] text-text-muted">Risk/Reward</p>
          {expanded ? <ChevronUp className="ml-auto mt-1 h-4 w-4 text-text-muted" /> : <ChevronDown className="ml-auto mt-1 h-4 w-4 text-text-muted" />}
        </div>
      </button>

      {/* Levels bar */}
      <div className="grid grid-cols-3 gap-px border-t border-border bg-border">
        <div className="bg-bg-secondary px-4 py-2">
          <p className="text-[10px] font-medium uppercase text-text-muted">Entry</p>
          <p className="text-sm font-bold text-blue-400">${idea.entry.toFixed(2)}</p>
        </div>
        <div className="bg-bg-secondary px-4 py-2">
          <p className="text-[10px] font-medium uppercase text-text-muted">Stop Loss</p>
          <p className="text-sm font-bold text-red">${idea.stopLoss.toFixed(2)}</p>
          <p className="text-[10px] text-red">-{idea.riskPct}%</p>
        </div>
        <div className="bg-bg-secondary px-4 py-2">
          <p className="text-[10px] font-medium uppercase text-text-muted">Target</p>
          <p className="text-sm font-bold text-green">${idea.target.toFixed(2)}</p>
          <p className="text-[10px] text-green">+{idea.rewardPct}%</p>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-border p-4">
          {/* Evidence */}
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Why This Setup
            </p>
            <ul className="space-y-1.5">
              {idea.evidence.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  {e}
                </li>
              ))}
            </ul>
          </div>

          {/* Chart */}
          {chartLoading ? (
            <Skeleton className="mb-4 h-[160px]" />
          ) : levels && levels.data.length > 2 ? (
            <div className="mb-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Setup Visualization
              </p>
              <SetupChart levels={levels} />
            </div>
          ) : null}

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/planner?ticker=${idea.ticker}&entry=${idea.entry}&stop=${idea.stopLoss}&target=${idea.target}`}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-accent/90"
            >
              <ClipboardList className="h-3 w-3" />
              Add to Planner
            </Link>
            <Link
              to={`/dna/${idea.ticker}`}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] text-text-secondary transition-colors hover:bg-bg-hover"
            >
              <Dna className="h-3 w-3" />
              Stock DNA
            </Link>
            <Link
              to={`/ticker/${idea.ticker}`}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] text-text-secondary transition-colors hover:bg-bg-hover"
            >
              <ArrowUpRight className="h-3 w-3" />
              Full Chart
            </Link>
            <button
              type="button"
              onClick={() => isWatching ? remove(idea.ticker) : add(idea.ticker)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] transition-colors ${
                isWatching
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-secondary hover:bg-bg-hover"
              }`}
            >
              <Star className={`h-3 w-3 ${isWatching ? "fill-accent" : ""}`} />
              {isWatching ? "Watching" : "Watch"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
