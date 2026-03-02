import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Clock, X, AlertTriangle } from "lucide-react";
import { useMarketOverview, usePipelineStatus } from "@/api/hooks/useMarket";
import { useTickerList } from "@/api/hooks/useTickers";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/ui/Skeleton";
import { MarketOverviewCard } from "./components/MarketOverviewCard";
import { SectorHeatmapCard } from "./components/SectorHeatmapCard";
import { TopMoversCard } from "./components/TopMoversCard";
import { PipelineStatusCard } from "./components/PipelineStatusCard";
import { RecentSignalsCard } from "./components/RecentSignalsCard";

const RECENT_KEY = "peakdipvibe-recent-searches";

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(ticker: string) {
  const recent = loadRecent().filter((t) => t !== ticker);
  recent.unshift(ticker);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 8)));
  } catch {
    // Silently ignore — quota exceeded or private browsing mode.
  }
}

export function DashboardPage() {
  usePageTitle("Market Dashboard");
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(searchInput, 200);

  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useMarketOverview();
  const { data: status, isLoading: statusLoading, isError: statusError } = usePipelineStatus();
  const { data: searchResults } = useTickerList(debouncedSearch || undefined);

  const recentSearches = loadRecent();
  const results = searchInput.length > 0 ? searchResults?.slice(0, 12) : [];
  const showRecent = showDropdown && searchInput.length === 0 && recentSearches.length > 0;

  const goToTicker = useCallback(
    (ticker: string) => {
      saveRecent(ticker);
      navigate(`/ticker/${ticker}`);
      setSearchInput("");
      setShowDropdown(false);
    },
    [navigate]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = results || [];
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.min(prev + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.max(prev - 1, -1));
      } else if (e.key === "Enter" && selectedIdx >= 0 && items[selectedIdx]) {
        goToTicker(items[selectedIdx].ticker);
      } else if (e.key === "Escape") {
        setShowDropdown(false);
        inputRef.current?.blur();
      }
    },
    [results, selectedIdx, goToTicker]
  );

  // Reset selection when results change
  useEffect(() => setSelectedIdx(-1), [searchResults]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Market Dashboard</h1>
        <p className="mt-1 text-sm text-text-muted">
          S&P 500 analytics powered by 7 years of daily OHLCV data
        </p>
      </div>

      {/* Search */}
      <div className="relative" ref={dropdownRef}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search tickers... (e.g. AAPL, Microsoft, Technology)"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          aria-label="Search stocks by ticker or name"
          aria-expanded={showDropdown && (showRecent || (searchInput.length > 0 && !!results?.length))}
          aria-haspopup="listbox"
          aria-controls="search-dropdown"
          aria-autocomplete="list"
          className="w-full rounded-xl border border-border bg-bg-card py-2.5 pl-10 pr-9 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />

        {/* Clear button */}
        {searchInput.length > 0 && (
          <button
            onClick={() => {
              setSearchInput("");
              inputRef.current?.focus();
              setShowDropdown(true);
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Recent searches */}
        {showRecent && (
          <div id="search-dropdown" role="listbox" aria-label="Recent searches" className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-border bg-bg-secondary shadow-xl">
            <div className="flex items-center gap-1.5 px-4 pt-2 pb-1 text-[10px] text-text-muted">
              <Clock className="h-3 w-3" />
              Recent Searches
            </div>
            {recentSearches.map((t) => (
              <button
                key={t}
                type="button"
                role="option"
                onClick={() => goToTicker(t)}
                className="flex w-full items-center px-4 py-2 text-left text-sm text-accent transition-colors hover:bg-bg-hover"
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Search results dropdown */}
        {searchInput.length > 0 && results && results.length > 0 && showDropdown && (
          <div id="search-dropdown" role="listbox" aria-label="Search results" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-bg-secondary shadow-xl">
            {results.map((t, i) => (
              <button
                key={t.ticker}
                type="button"
                role="option"
                aria-selected={i === selectedIdx}
                onClick={() => goToTicker(t.ticker)}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-bg-hover ${
                  i === selectedIdx ? "bg-bg-hover" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-accent">
                    {t.ticker}
                  </span>
                  <span className="text-sm text-text-secondary">{t.name}</span>
                </div>
                <span className="text-xs text-text-muted">{t.sector}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats cards */}
      {statusLoading ? (
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : statusError ? (
        <div className="flex items-center gap-2 rounded-xl border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Could not load market data. The API may be offline.
        </div>
      ) : (
        status && <MarketOverviewCard status={status} />
      )}

      {/* Pipeline status */}
      {status && <PipelineStatusCard status={status} />}

      {/* Recent signals */}
      <RecentSignalsCard />

      {/* Sector heatmap */}
      {overviewLoading ? (
        <Skeleton className="h-72" />
      ) : overviewError ? (
        <div className="flex items-center gap-2 rounded-xl border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Could not load sector data.
        </div>
      ) : (
        overview && <SectorHeatmapCard sectors={overview.sectors} />
      )}

      {/* Top movers */}
      {overviewLoading ? (
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        overview && (
          <TopMoversCard
            gainers={overview.top_gainers}
            losers={overview.top_losers}
          />
        )
      )}
    </div>
  );
}
