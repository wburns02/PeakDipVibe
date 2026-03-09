import { useState, useCallback } from "react";
import {
  addTrade,
  TRADE_TAGS,
  type TradeSide,
} from "../lib/journal";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
  onSaved: () => void;
  prefill?: {
    ticker?: string;
    entryPrice?: number;
    shares?: number;
    stopLoss?: number;
    targetPrice?: number;
    side?: TradeSide;
  };
}

export function TradeForm({ onClose, onSaved, prefill }: Props) {
  const [ticker, setTicker] = useState(prefill?.ticker ?? "");
  const [side, setSide] = useState<TradeSide>(prefill?.side ?? "long");
  const [entryPrice, setEntryPrice] = useState(prefill?.entryPrice?.toString() ?? "");
  const [shares, setShares] = useState(prefill?.shares?.toString() ?? "");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [stopLoss, setStopLoss] = useState(prefill?.stopLoss?.toString() ?? "");
  const [targetPrice, setTargetPrice] = useState(prefill?.targetPrice?.toString() ?? "");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState("");

  const toggleTag = useCallback((tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleSubmit = useCallback(() => {
    const t = ticker.trim().toUpperCase();
    const ep = Number(entryPrice);
    const sh = Number(shares);

    if (!t) { setError("Ticker is required"); return; }
    if (!ep || ep <= 0) { setError("Enter a valid entry price"); return; }
    if (!sh || sh <= 0) { setError("Enter a valid number of shares"); return; }

    addTrade({
      ticker: t,
      side,
      entryPrice: ep,
      entryDate,
      shares: sh,
      stopLoss: stopLoss ? Number(stopLoss) : null,
      targetPrice: targetPrice ? Number(targetPrice) : null,
      exitPrice: null,
      exitDate: null,
      notes,
      tags,
    });

    onSaved();
    onClose();
  }, [ticker, side, entryPrice, shares, entryDate, stopLoss, targetPrice, notes, tags, onSaved, onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-secondary shadow-2xl animate-slideUp">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-text-primary">Log Trade</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && (
            <p className="rounded-lg bg-red/10 px-3 py-2 text-xs font-medium text-red">{error}</p>
          )}

          {/* Side toggle */}
          <div className="flex rounded-lg border border-border bg-bg-primary p-0.5">
            {(["long", "short"] as TradeSide[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={`flex-1 rounded-md py-2.5 text-sm font-semibold transition-colors ${
                  side === s
                    ? s === "long"
                      ? "bg-green/10 text-green"
                      : "bg-red/10 text-red"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {s === "long" ? "Long (Buy)" : "Short (Sell)"}
              </button>
            ))}
          </div>

          {/* Ticker + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Ticker</label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => { setTicker(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase()); setError(""); }}
                placeholder="AAPL"
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm font-mono font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Entry Date</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Price + Shares */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Entry Price ($)</label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => { setEntryPrice(e.target.value); setError(""); }}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Shares</label>
              <input
                type="number"
                value={shares}
                onChange={(e) => { setShares(e.target.value); setError(""); }}
                placeholder="0"
                min="1"
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Stop + Target */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Stop Loss ($)</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Optional"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Target ($)</label>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Optional"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Strategy Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {TRADE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    tags.includes(tag)
                      ? "bg-accent/15 text-accent border border-accent/30"
                      : "bg-bg-primary text-text-muted border border-border hover:border-accent/20 hover:text-text-secondary"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why are you taking this trade?"
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-3 text-sm text-text-secondary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-3 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Log Trade
          </button>
        </div>
      </div>
    </div>
  );
}
