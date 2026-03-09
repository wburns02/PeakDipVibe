import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import type { TradeWithPnl } from "../lib/journal";
import { closeTrade, deleteTrade } from "../lib/journal";
import {
  TrendingUp,
  TrendingDown,
  X,
  Check,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface Props {
  trades: TradeWithPnl[];
  onUpdate: () => void;
}

export function OpenPositions({ trades, onUpdate }: Props) {
  const open = trades.filter((t) => t.status === "open");

  if (open.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Open Positions
          <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
            {open.length}
          </span>
        </h3>
        <div className="text-xs text-text-muted">
          Total P&L:{" "}
          <span className={open.reduce((s, t) => s + t.unrealizedPnl, 0) >= 0 ? "text-green font-semibold" : "text-red font-semibold"}>
            ${open.reduce((s, t) => s + t.unrealizedPnl, 0).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="divide-y divide-border">
        {open.map((trade) => (
          <PositionRow key={trade.id} trade={trade} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  );
}

function PositionRow({ trade, onUpdate }: { trade: TradeWithPnl; onUpdate: () => void }) {
  const [showClose, setShowClose] = useState(false);
  const [exitPrice, setExitPrice] = useState(trade.currentPrice.toFixed(2));
  const [exitDate, setExitDate] = useState(new Date().toISOString().slice(0, 10));

  const handleClose = useCallback(() => {
    const ep = Number(exitPrice);
    if (ep <= 0) return;
    closeTrade(trade.id, ep, exitDate);
    onUpdate();
  }, [trade.id, exitPrice, exitDate, onUpdate]);

  const handleDelete = useCallback(() => {
    deleteTrade(trade.id);
    onUpdate();
  }, [trade.id, onUpdate]);

  const pnlColor = trade.unrealizedPnl >= 0 ? "text-green" : "text-red";
  const pnlBg = trade.unrealizedPnl >= 0 ? "bg-green/5" : "bg-red/5";

  return (
    <div className={`px-5 py-3 ${pnlBg} transition-colors`}>
      <div className="flex items-center gap-3">
        {/* Direction icon */}
        <div className={`rounded-lg p-1.5 ${trade.side === "long" ? "bg-green/10" : "bg-red/10"}`}>
          {trade.side === "long" ? (
            <TrendingUp className="h-3.5 w-3.5 text-green" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red" />
          )}
        </div>

        {/* Ticker + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-text-primary">{trade.ticker}</span>
            <span className="text-[10px] font-medium uppercase text-text-muted">
              {trade.side} &middot; {trade.shares} shares
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-text-muted">
            <span>Entry: ${trade.entryPrice.toFixed(2)}</span>
            {trade.stopLoss && <span>Stop: ${trade.stopLoss.toFixed(2)}</span>}
            {trade.targetPrice && <span>Target: ${trade.targetPrice.toFixed(2)}</span>}
            <span>{trade.holdingDays}d held</span>
          </div>
        </div>

        {/* P&L */}
        <div className="text-right shrink-0">
          <div className={`font-mono text-sm font-bold ${pnlColor}`}>
            {trade.unrealizedPnl >= 0 ? "+" : ""}${trade.unrealizedPnl.toFixed(2)}
          </div>
          <div className={`text-[11px] font-medium ${pnlColor}`}>
            {trade.unrealizedPnlPct >= 0 ? "+" : ""}{trade.unrealizedPnlPct.toFixed(2)}%
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Link
            to={`/ticker/${trade.ticker}`}
            className="rounded p-1.5 text-text-muted hover:bg-bg-hover hover:text-accent"
            title="View chart"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setShowClose((v) => !v)}
            className="rounded p-1.5 text-text-muted hover:bg-green/10 hover:text-green"
            title="Close trade"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded p-1.5 text-text-muted hover:bg-red/10 hover:text-red"
            title="Delete trade"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Close form */}
      {showClose && (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-bg-secondary p-3 animate-slideDown">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-text-muted">Exit Price</label>
            <input
              type="number"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              step="0.01"
              className="w-28 rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-sm font-mono text-text-primary focus:border-accent focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-text-muted">Exit Date</label>
            <input
              type="date"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              className="rounded-lg border border-border bg-bg-primary px-2 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg bg-green/10 px-4 py-2.5 text-sm font-semibold text-green transition-colors hover:bg-green/20"
          >
            Close Trade
          </button>
          <button
            type="button"
            onClick={() => setShowClose(false)}
            className="rounded-lg px-3 py-2.5 text-sm text-text-muted hover:text-text-primary"
          >
            <X className="inline h-3 w-3" /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}
