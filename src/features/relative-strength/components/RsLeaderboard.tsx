import { useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import type { RsStock } from "../lib/rs-engine";
import { rsScoreColor } from "../lib/rs-engine";

type SortKey = "rsScore" | "ticker" | "changePct" | "rsi";

interface Props {
  stocks: RsStock[];
  selectedTicker: string | null;
  onSelect: (ticker: string) => void;
}

export function RsLeaderboard({ stocks, selectedTicker, onSelect }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("rsScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAll, setShowAll] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "ticker" ? "asc" : "desc"); }
  };

  const sorted = [...stocks].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "ticker") return a.ticker.localeCompare(b.ticker) * dir;
    return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
  });

  const visible = showAll ? sorted : sorted.slice(0, 25);
  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col
      ? sortDir === "desc"
        ? <ChevronDown className="h-3 w-3" />
        : <ChevronUp className="h-3 w-3" />
      : null;

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[2rem_4.5rem_1fr_5rem_6rem_4.5rem_3.5rem] items-center gap-1 border-b border-border px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted sm:grid-cols-[2rem_5rem_1fr_6rem_7rem_5rem_4rem]">
        <span>#</span>
        <button type="button" onClick={() => toggleSort("ticker")} className="flex items-center gap-0.5 hover:text-text-primary">
          Ticker <SortIcon col="ticker" />
        </button>
        <span className="hidden sm:block">Name</span>
        <span className="hidden sm:block">Sector</span>
        <button type="button" onClick={() => toggleSort("rsScore")} className="flex items-center gap-0.5 hover:text-text-primary">
          RS Score <SortIcon col="rsScore" />
        </button>
        <button type="button" onClick={() => toggleSort("changePct")} className="flex items-center gap-0.5 hover:text-text-primary">
          Change <SortIcon col="changePct" />
        </button>
        <span>Trend</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50">
        {visible.map((stock, i) => {
          const rank = stocks.indexOf(stocks.find((s) => s.ticker === stock.ticker)!) + 1;
          const displayRank = sortKey === "rsScore" && sortDir === "desc" ? i + 1 : rank;
          const color = rsScoreColor(stock.rsScore);
          const isSelected = stock.ticker === selectedTicker;

          return (
            <button
              key={stock.ticker}
              type="button"
              onClick={() => onSelect(stock.ticker)}
              className={`grid w-full grid-cols-[2rem_4.5rem_1fr_5rem_6rem_4.5rem_3.5rem] items-center gap-1 px-2 py-2 text-left text-xs transition-colors sm:grid-cols-[2rem_5rem_1fr_6rem_7rem_5rem_4rem] ${
                isSelected
                  ? "bg-accent/10 border-l-2 border-l-accent"
                  : "hover:bg-bg-hover"
              }`}
            >
              <span className="text-text-muted tabular-nums">{displayRank}</span>
              <Link
                to={`/ticker/${stock.ticker}`}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-accent hover:underline"
              >
                {stock.ticker}
              </Link>
              <span className="hidden truncate text-text-secondary sm:block">{stock.name}</span>
              <span className="hidden sm:block">
                <span className="rounded-full bg-bg-hover px-2 py-0.5 text-[10px] text-text-muted">
                  {stock.sector.length > 15 ? stock.sector.slice(0, 13) + ".." : stock.sector}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-12 overflow-hidden rounded-full bg-bg-hover">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${stock.rsScore}%`, backgroundColor: color }}
                  />
                </div>
                <span className="font-bold tabular-nums" style={{ color }}>{stock.rsScore}</span>
              </div>
              <span className={`tabular-nums ${stock.changePct >= 0 ? "text-green" : "text-red"}`}>
                {stock.changePct >= 0 ? "+" : ""}{stock.changePct.toFixed(2)}%
              </span>
              <span>
                {stock.trend === "improving" ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green" />
                ) : stock.trend === "declining" ? (
                  <TrendingDown className="h-3.5 w-3.5 text-red" />
                ) : (
                  <Minus className="h-3.5 w-3.5 text-text-muted" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Show more */}
      {!showAll && sorted.length > 25 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 w-full rounded-lg border border-border py-2 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
        >
          Show all {sorted.length} stocks
        </button>
      )}
      {showAll && sorted.length > 25 && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="mt-2 w-full rounded-lg border border-border py-2 text-xs text-text-muted transition-colors hover:bg-bg-hover"
        >
          Show top 25
        </button>
      )}
    </div>
  );
}
