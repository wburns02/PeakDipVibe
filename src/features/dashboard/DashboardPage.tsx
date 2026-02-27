import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useMarketOverview, usePipelineStatus } from "@/api/hooks/useMarket";
import { useTickerList } from "@/api/hooks/useTickers";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/ui/Skeleton";
import { MarketOverviewCard } from "./components/MarketOverviewCard";
import { SectorHeatmapCard } from "./components/SectorHeatmapCard";
import { TopMoversCard } from "./components/TopMoversCard";
import { PipelineStatusCard } from "./components/PipelineStatusCard";

export function DashboardPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 200);

  const { data: overview, isLoading: overviewLoading } = useMarketOverview();
  const { data: status, isLoading: statusLoading } = usePipelineStatus();
  const { data: searchResults } = useTickerList(
    debouncedSearch || undefined
  );

  const showSearch = searchInput.length > 0;

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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search tickers... (e.g. AAPL, Microsoft, Technology)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full rounded-xl border border-border bg-bg-card py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />

        {/* Search dropdown */}
        {showSearch && searchResults && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-bg-secondary shadow-xl">
            {searchResults.slice(0, 12).map((t) => (
              <button
                key={t.ticker}
                type="button"
                onClick={() => {
                  navigate(`/ticker/${t.ticker}`);
                  setSearchInput("");
                }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-bg-hover"
              >
                <div>
                  <span className="mr-2 text-sm font-semibold text-accent">
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
      ) : (
        status && <MarketOverviewCard status={status} />
      )}

      {/* Pipeline status */}
      {status && <PipelineStatusCard status={status} />}

      {/* Sector heatmap */}
      {overviewLoading ? (
        <Skeleton className="h-72" />
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
