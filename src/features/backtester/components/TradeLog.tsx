import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { BacktestResult, Trade } from "../lib/backtest-engine";

const EXIT_LABELS: Record<Trade["exitReason"], string> = {
  take_profit: "TP Hit",
  stop_loss: "SL Hit",
  max_hold: "Max Hold",
  signal_exit: "Signal",
};

const EXIT_COLORS: Record<Trade["exitReason"], string> = {
  take_profit: "text-green bg-green/10",
  stop_loss: "text-red bg-red/10",
  max_hold: "text-text-muted bg-bg-hover",
  signal_exit: "text-accent bg-accent/10",
};

export function TradeLog({ result }: { result: BacktestResult }) {
  const [sortBy, setSortBy] = useState<"date" | "return" | "hold">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAll, setShowAll] = useState(false);

  const sorted = [...result.trades].sort((a, b) => {
    if (sortBy === "date") return sortDir === "desc" ? b.entryDate.localeCompare(a.entryDate) : a.entryDate.localeCompare(b.entryDate);
    if (sortBy === "return") return sortDir === "desc" ? b.returnPct - a.returnPct : a.returnPct - b.returnPct;
    return sortDir === "desc" ? b.holdDays - a.holdDays : a.holdDays - b.holdDays;
  });

  const visible = showAll ? sorted : sorted.slice(0, 20);

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("desc"); }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => (
    sortBy === col
      ? sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3 opacity-30" />
  );

  return (
    <div className="rounded-xl border border-border bg-bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Trade Log
        </h3>
        <span className="text-xs text-text-muted">
          {result.trades.length} trades
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="px-3 py-2 text-left font-medium">Ticker</th>
              <th
                className="px-3 py-2 text-left font-medium cursor-pointer select-none"
                onClick={() => toggleSort("date")}
              >
                <span className="inline-flex items-center gap-1">
                  Entry <SortIcon col="date" />
                </span>
              </th>
              <th className="px-3 py-2 text-right font-medium">Entry $</th>
              <th className="px-3 py-2 text-right font-medium">Exit $</th>
              <th
                className="px-3 py-2 text-right font-medium cursor-pointer select-none"
                onClick={() => toggleSort("return")}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Return <SortIcon col="return" />
                </span>
              </th>
              <th
                className="px-3 py-2 text-right font-medium cursor-pointer select-none"
                onClick={() => toggleSort("hold")}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Days <SortIcon col="hold" />
                </span>
              </th>
              <th className="px-3 py-2 text-center font-medium">Exit</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t, i) => (
              <tr
                key={`${t.ticker}-${t.entryDate}-${i}`}
                className="border-b border-border/50 transition-colors hover:bg-bg-hover"
              >
                <td className="px-3 py-2">
                  <Link
                    to={`/ticker/${t.ticker}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {t.ticker}
                  </Link>
                </td>
                <td className="px-3 py-2 text-text-secondary">
                  {t.entryDate}
                </td>
                <td className="px-3 py-2 text-right font-mono text-text-secondary">
                  ${t.entryPrice.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-text-secondary">
                  ${t.exitPrice.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  <span
                    className={`inline-flex items-center gap-0.5 font-mono font-medium ${
                      t.returnPct >= 0 ? "text-green" : "text-red"
                    }`}
                  >
                    {t.returnPct >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {t.returnPct >= 0 ? "+" : ""}
                    {t.returnPct.toFixed(2)}%
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-text-muted">
                  {t.holdDays}d
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${EXIT_COLORS[t.exitReason]}`}
                  >
                    {EXIT_LABELS[t.exitReason]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.trades.length > 20 && !showAll && (
        <div className="border-t border-border px-4 py-2 text-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-xs text-accent hover:underline"
          >
            Show all {result.trades.length} trades
          </button>
        </div>
      )}
    </div>
  );
}
