import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, ClipboardList, Dna, ExternalLink, Star } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import type { Divergence } from "../lib/divergence-engine";
import { divColor } from "../lib/divergence-engine";
import { DivergenceChart } from "./DivergenceChart";

interface Props {
  divergence: Divergence;
}

export function DivergenceCard({ divergence: d }: Props) {
  const { watchlist, toggle } = useWatchlist();
  const isWatching = watchlist.includes(d.ticker);
  const color = divColor(d.type);
  const isBull = d.type === "bullish";

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
                to={`/ticker/${d.ticker}`}
                className="text-sm font-bold text-text-primary hover:text-accent transition-colors"
              >
                {d.ticker}
              </Link>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {isBull ? "Bullish" : "Bearish"}
              </span>
            </div>
            <p className="text-[10px] text-text-muted">
              {d.name} &middot; {d.sector}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-text-primary">${d.currentClose.toFixed(2)}</p>
          <div className="flex items-center gap-0.5 justify-end">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: i < d.conviction ? color : undefined,
                  opacity: i < d.conviction ? 1 : 0.15,
                  background: i >= d.conviction ? "var(--color-text-muted)" : undefined,
                }}
              />
            ))}
            <span className="ml-1 text-[10px] text-text-muted">{d.conviction}/5</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-3 py-2">
        <DivergenceChart
          data={d.chartSlice}
          type={d.type}
          swingADate={d.swingA.date}
          swingBDate={d.swingB.date}
          swingAClose={d.swingA.close}
          swingBClose={d.swingB.close}
          swingARsi={d.swingA.rsi}
          swingBRsi={d.swingB.rsi}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px border-t border-border bg-border">
        <div className="bg-bg-secondary px-3 py-2 text-center">
          <p className="text-[9px] uppercase tracking-wider text-text-muted">Price Move</p>
          <p className={`text-xs font-bold ${isBull ? "text-red" : "text-green"}`}>
            {d.priceDelta >= 0 ? "+" : ""}
            {d.priceDelta.toFixed(1)}%
          </p>
        </div>
        <div className="bg-bg-secondary px-3 py-2 text-center">
          <p className="text-[9px] uppercase tracking-wider text-text-muted">RSI Divergence</p>
          <p className={`text-xs font-bold ${isBull ? "text-green" : "text-red"}`}>
            {d.rsiDelta >= 0 ? "+" : ""}
            {d.rsiDelta.toFixed(1)}
          </p>
        </div>
        <div className="bg-bg-secondary px-3 py-2 text-center">
          <p className="text-[9px] uppercase tracking-wider text-text-muted">RSI Now</p>
          <p className="text-xs font-bold text-text-primary">{d.currentRsi.toFixed(0)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 border-t border-border px-3 py-2">
        <Link
          to={`/planner?add=${d.ticker}`}
          className="flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent transition-colors hover:bg-accent/20"
        >
          <ClipboardList className="h-3 w-3" /> Plan Trade
        </Link>
        <Link
          to={`/dna/${d.ticker}`}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          <Dna className="h-3 w-3" /> DNA
        </Link>
        <Link
          to={`/ticker/${d.ticker}`}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          <ExternalLink className="h-3 w-3" /> Chart
        </Link>
        <button
          type="button"
          onClick={() => toggle(d.ticker)}
          className={`ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
            isWatching
              ? "text-yellow-400"
              : "text-text-muted hover:bg-bg-hover hover:text-text-primary"
          }`}
        >
          <Star className={`h-3 w-3 ${isWatching ? "fill-yellow-400" : ""}`} />
        </button>
      </div>
    </div>
  );
}
