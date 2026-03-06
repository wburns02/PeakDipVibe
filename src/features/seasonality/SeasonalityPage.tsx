import { useState, useCallback, useMemo } from "react";
import { Calendar, Search, TrendingUp, Info, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useTickerList } from "@/api/hooks/useTickers";
import { useDebounce } from "@/hooks/useDebounce";
import { ThisMonthRankings } from "./components/ThisMonthRankings";
import { SeasonalBreakdown } from "./components/SeasonalBreakdown";
import { YearlyHeatmap } from "./components/YearlyHeatmap";
import { getCurrentMonth } from "./lib/seasonality";

export function SeasonalityPage() {
  const [selectedTicker, setSelectedTicker] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  const { label: monthLabel } = useMemo(() => getCurrentMonth(), []);

  const debouncedSearch = useDebounce(searchQuery, 150);
  const { data: tickerResults } = useTickerList(
    debouncedSearch.trim().length >= 1 ? debouncedSearch.trim() : undefined,
  );

  const handleSelect = useCallback((ticker: string) => {
    setSelectedTicker(ticker);
    setSearchQuery("");
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Calendar className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Seasonality Explorer
            </h1>
            <p className="text-sm text-text-muted">
              Historical monthly patterns — find the best months to buy & sell
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover"
        >
          <Info className="h-3.5 w-3.5" />
          How to Read
        </button>
      </div>

      {/* Guide */}
      {showGuide && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm text-text-secondary">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-accent">
              Understanding Seasonal Patterns
            </h3>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="text-text-muted hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-1 text-xs">
            <li>
              <strong>Average Return:</strong> Mean monthly return across all
              years. Positive = stock tends to go up that month.
            </li>
            <li>
              <strong>Win Rate:</strong> Percentage of years the stock was
              positive that month. Above 60% is reliable.
            </li>
            <li>
              <strong>Median Return:</strong> Middle value — less affected by
              outliers than average.
            </li>
            <li>
              <strong>Heatmap:</strong> Green = positive month, red = negative.
              Brighter = larger moves.
            </li>
            <li>
              <strong>Current month</strong> is highlighted in purple across all
              views.
            </li>
            <li>
              Seasonality works best combined with technical analysis — don't
              trade seasonality alone.
            </li>
          </ul>
        </div>
      )}

      {/* Current month hero */}
      <div className="rounded-xl border border-accent/20 bg-gradient-to-r from-accent/5 to-transparent p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
            <Calendar className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">
              We're in
            </p>
            <h2 className="text-2xl font-bold text-accent">{monthLabel}</h2>
          </div>
          <div className="ml-auto text-right text-xs text-text-muted">
            <p>Which stocks in your watchlist</p>
            <p>historically perform best this month?</p>
          </div>
        </div>
      </div>

      {/* Watchlist seasonal rankings */}
      <ThisMonthRankings onSelect={handleSelect} />

      {/* Search any stock */}
      <div className="relative">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-card px-4 py-3">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value.replace(/[^a-zA-Z0-9 .\-]/g, ""))
            }
            placeholder="Search any stock for seasonal analysis..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          {selectedTicker && (
            <button
              type="button"
              onClick={() => setSelectedTicker("")}
              className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20"
            >
              {selectedTicker}
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {tickerResults && tickerResults.length > 0 && searchQuery.trim() && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-bg-secondary shadow-xl">
            {tickerResults.slice(0, 6).map((t) => (
              <button
                key={t.ticker}
                type="button"
                onClick={() => handleSelect(t.ticker)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-bg-hover"
              >
                <TrendingUp className="h-3.5 w-3.5 text-text-muted" />
                <span className="font-medium text-accent">{t.ticker}</span>
                <span className="truncate text-text-muted">{t.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Deep dive for selected ticker */}
      {selectedTicker ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary">
              {selectedTicker} — Seasonal Breakdown
            </h2>
            <Link
              to={`/ticker/${selectedTicker}`}
              className="text-xs text-accent hover:underline"
            >
              View full chart &rarr;
            </Link>
          </div>
          <SeasonalBreakdown ticker={selectedTicker} />
          <YearlyHeatmap ticker={selectedTicker} />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
          <Calendar className="mx-auto h-8 w-8 text-text-muted mb-2" />
          <p className="text-sm text-text-muted">
            Select a stock from your watchlist above or search for any ticker to
            explore its seasonal patterns
          </p>
        </div>
      )}
    </div>
  );
}
