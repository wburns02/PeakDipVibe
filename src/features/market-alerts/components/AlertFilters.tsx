import type { AlertBias } from "../lib/alerts";

interface Props {
  watchlistOnly: boolean;
  onWatchlistToggle: () => void;
  biasFilter: AlertBias | null;
  onBiasChange: (bias: AlertBias | null) => void;
  sectorFilter: string | null;
  onSectorChange: (sector: string | null) => void;
  sectors: string[];
}

export function AlertFilters({
  watchlistOnly,
  onWatchlistToggle,
  biasFilter,
  onBiasChange,
  sectorFilter,
  onSectorChange,
  sectors,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Watchlist toggle */}
      <button
        type="button"
        onClick={onWatchlistToggle}
        className={`rounded-lg border px-3 py-3 text-sm font-medium transition-all ${
          watchlistOnly
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-border bg-bg-card text-text-secondary hover:border-border"
        }`}
      >
        {watchlistOnly ? "Watchlist Only" : "All Stocks"}
      </button>

      {/* Bias filter */}
      <div className="flex items-center rounded-lg border border-border bg-bg-card">
        {(["bullish", "bearish", "neutral"] as const).map((bias) => (
          <button
            key={bias}
            type="button"
            onClick={() => onBiasChange(biasFilter === bias ? null : bias)}
            className={`px-2.5 py-3 text-sm font-medium transition-colors ${
              biasFilter === bias
                ? bias === "bullish"
                  ? "bg-green/15 text-green"
                  : bias === "bearish"
                    ? "bg-red/15 text-red"
                    : "bg-blue-500/15 text-blue-400"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {bias === "bullish" ? "Bullish" : bias === "bearish" ? "Bearish" : "Neutral"}
          </button>
        ))}
      </div>

      {/* Sector filter */}
      {sectors.length > 0 && (
        <select
          value={sectorFilter ?? ""}
          onChange={(e) => onSectorChange(e.target.value || null)}
          className="rounded-lg border border-border bg-bg-card px-2.5 py-3 text-sm text-text-secondary outline-none transition-colors hover:border-accent/30 focus:border-accent/50"
        >
          <option value="">All Sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}
    </div>
  );
}
