import { useState } from "react";
import type { TradeWithPnl } from "../lib/journal";
import { deleteTrade } from "../lib/journal";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  trades: TradeWithPnl[];
  onUpdate: () => void;
}

export function TradeHistory({ trades, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(true);
  const closed = trades
    .filter((t) => t.status === "closed")
    .sort((a, b) => (b.exitDate ?? "").localeCompare(a.exitDate ?? ""));

  if (closed.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-bg-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <h3 className="text-sm font-semibold text-text-primary">
          Closed Trades
          <span className="ml-2 rounded-full bg-bg-secondary px-2 py-0.5 text-xs font-semibold text-text-muted">
            {closed.length}
          </span>
        </h3>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-t border-border text-xs font-semibold uppercase tracking-wider text-text-muted">
                <th className="px-5 py-2">Ticker</th>
                <th className="px-3 py-2">Side</th>
                <th className="px-3 py-2">Entry</th>
                <th className="px-3 py-2">Exit</th>
                <th className="px-3 py-2">Shares</th>
                <th className="px-3 py-2">P&L</th>
                <th className="px-3 py-2">Return</th>
                <th className="px-3 py-2">Days</th>
                <th className="px-3 py-2">Tags</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {closed.map((t) => (
                <tr key={t.id} className="hover:bg-bg-hover transition-colors">
                  <td className="px-5 py-2.5">
                    <span className="font-semibold text-text-primary">{t.ticker}</span>
                    <span className="ml-1.5 text-xs text-text-muted">{t.exitDate}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold uppercase ${t.side === "long" ? "text-green" : "text-red"}`}>
                      {t.side}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-text-secondary">${t.entryPrice.toFixed(2)}</td>
                  <td className="px-3 py-2.5 font-mono text-text-secondary">${t.exitPrice?.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{t.shares}</td>
                  <td className={`px-3 py-2.5 font-mono font-semibold ${t.realizedPnl >= 0 ? "text-green" : "text-red"}`}>
                    {t.realizedPnl >= 0 ? "+" : ""}${t.realizedPnl.toFixed(2)}
                  </td>
                  <td className={`px-3 py-2.5 font-mono ${t.realizedPnlPct >= 0 ? "text-green" : "text-red"}`}>
                    {t.realizedPnlPct >= 0 ? "+" : ""}{t.realizedPnlPct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5 text-text-muted">{t.holdingDays}d</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {t.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded bg-accent/10 px-1.5 py-0.5 text-xs text-accent">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => { deleteTrade(t.id); onUpdate(); }}
                      className="rounded p-1 text-text-muted opacity-0 transition-opacity hover:text-red group-hover:opacity-100 [tr:hover_&]:opacity-100"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
