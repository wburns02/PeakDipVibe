import { useState } from "react";
import { Zap, Search } from "lucide-react";
import type { SqueezeStock } from "../lib/squeeze-engine";
import { squeezeColor, squeezeLabel } from "../lib/squeeze-engine";

interface Props {
  stocks: SqueezeStock[];
  selected: string | null;
  onSelect: (ticker: string) => void;
}

type SortKey = "percentile" | "fired" | "squeezeDays";

export function SqueezeTable({ stocks, selected, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("percentile");

  const filtered = stocks.filter(
    (s) =>
      !search ||
      s.ticker.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "percentile":
        return a.bbWidthPercentile - b.bbWidthPercentile;
      case "fired":
        return (b.fired ? 1 : 0) - (a.fired ? 1 : 0) || a.bbWidthPercentile - b.bbWidthPercentile;
      case "squeezeDays":
        return b.squeezeDays - a.squeezeDays;
      default:
        return 0;
    }
  });

  return (
    <div className="rounded-2xl border border-border bg-bg-secondary">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-bg-primary px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ""))}
            placeholder="Filter..."
            className="flex-1 bg-transparent py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1">
          {(
            [
              ["percentile", "Tightest"],
              ["fired", "Fired"],
              ["squeezeDays", "Duration"],
            ] as [SortKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortBy(key)}
              className={`rounded-md px-2.5 py-2.5 text-xs font-medium transition-colors ${
                sortBy === key
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="max-h-[520px] overflow-y-auto">
        {sorted.map((stock, i) => {
          const isSelected = selected === stock.ticker;
          const color = squeezeColor(stock.bbWidthPercentile);
          return (
            <button
              key={stock.ticker}
              type="button"
              onClick={() => onSelect(stock.ticker)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                isSelected ? "bg-accent/10" : "hover:bg-bg-hover"
              }`}
            >
              {/* Rank */}
              <span className="w-5 shrink-0 text-center text-[11px] font-mono text-text-muted">
                {i + 1}
              </span>

              {/* Ticker + Name */}
              <div className="w-16 shrink-0 min-w-0">
                <p
                  className={`text-xs font-bold ${isSelected ? "text-accent" : "text-text-primary"}`}
                >
                  {stock.ticker}
                </p>
                <p className="truncate text-[11px] text-text-muted">{stock.name}</p>
              </div>

              {/* Squeeze Meter */}
              <div className="flex flex-1 items-center gap-1.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-primary">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(100 - stock.bbWidthPercentile, 4)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <span
                  className="w-6 text-right text-[11px] font-mono font-medium"
                  style={{ color }}
                >
                  {stock.bbWidthPercentile}
                </span>
              </div>

              {/* Status */}
              <div className="w-16 shrink-0 text-center">
                {stock.fired ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[11px] font-bold text-orange-400 animate-pulse">
                    <Zap className="h-2.5 w-2.5" /> Fired!
                  </span>
                ) : stock.inSqueeze ? (
                  <span className="inline-flex rounded-full bg-green-500/15 px-1.5 py-0.5 text-[11px] font-medium text-green-400">
                    Squeeze
                  </span>
                ) : stock.bbWidthPercentile <= 30 ? (
                  <span className="text-[11px] font-medium text-yellow-400">
                    {squeezeLabel(stock.bbWidthPercentile)}
                  </span>
                ) : (
                  <span className="text-[11px] text-text-muted">
                    {squeezeLabel(stock.bbWidthPercentile)}
                  </span>
                )}
              </div>

              {/* Change */}
              <span
                className={`w-11 shrink-0 text-right text-[11px] font-medium ${
                  stock.changePct >= 0 ? "text-green" : "text-red"
                }`}
              >
                {stock.changePct >= 0 ? "+" : ""}
                {stock.changePct.toFixed(1)}%
              </span>
            </button>
          );
        })}

        {sorted.length === 0 && (
          <div className="py-8 text-center text-xs text-text-muted">
            No stocks match your filter
          </div>
        )}
      </div>

      <div className="border-t border-border px-3 py-2 text-center text-[11px] text-text-muted">
        {sorted.length} stocks &middot; Lower percentile = tighter squeeze
      </div>
    </div>
  );
}
