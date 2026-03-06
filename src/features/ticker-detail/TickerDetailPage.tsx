import { lazy, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ChevronRight, Star } from "lucide-react";
import { useTicker } from "@/api/hooks/useTickers";
import { useLatestIndicators } from "@/api/hooks/useIndicators";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { CompanyInfoCard } from "./components/CompanyInfoCard";
import { QuickStats } from "./components/QuickStats";
import { PriceChartPanel } from "./components/PriceChartPanel";
import { IndicatorPanel } from "./components/IndicatorPanel";
import { TechnicalSummary } from "./components/TechnicalSummary";
import { SectorPeersPanel } from "./components/SectorPeersPanel";
import { SeasonalTrendsCard } from "./components/SeasonalTrendsCard";

const BacktestPanel = lazy(() =>
  import("./components/BacktestPanel").then((m) => ({ default: m.BacktestPanel }))
);
const SignalHistoryCard = lazy(() =>
  import("@/features/signals/components/SignalHistoryCard").then((m) => ({ default: m.SignalHistoryCard }))
);

export function TickerDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  usePageTitle(symbol ? `${symbol} — Stock Detail` : "Stock Detail");
  const { data: ticker, isLoading, error } = useTicker(symbol ?? "");
  const { data: indicators } = useLatestIndicators(symbol ?? "");
  const { toggle, isWatched } = useWatchlist();
  const { show: showToast } = useToast();

  // Breadcrumb: sector link when available, otherwise Dashboard
  const sectorLink = ticker?.sector
    ? { label: ticker.sector, to: `/screener?sector=${encodeURIComponent(ticker.sector)}` }
    : null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-28" />
        <Skeleton className="h-[520px]" />
      </div>
    );
  }

  if (error || !ticker) {
    return (
      <div className="mx-auto max-w-6xl">
        <nav className="mb-4 flex items-center gap-1 text-sm text-text-muted" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-accent">Dashboard</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-text-secondary">{symbol}</span>
        </nav>
        <div className="rounded-xl border border-border bg-bg-card p-12 text-center">
          <p className="text-lg font-semibold text-text-primary">
            Ticker not found
          </p>
          <p className="mt-1 text-sm text-text-muted">
            "{symbol}" doesn't exist in our database
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Breadcrumb + watchlist */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-1 text-sm text-text-muted" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-accent">Dashboard</Link>
          {sectorLink && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link to={sectorLink.to} className="hidden hover:text-accent sm:inline">{sectorLink.label}</Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-text-primary">{ticker.ticker}</span>
        </nav>
        <button
          type="button"
          onClick={() => {
            const wasWatched = isWatched(ticker.ticker);
            toggle(ticker.ticker);
            showToast(wasWatched ? `${ticker.ticker} removed from watchlist` : `${ticker.ticker} added to watchlist`);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:border-amber hover:text-amber"
        >
          <Star
            className={`h-4 w-4 ${
              isWatched(ticker.ticker) ? "fill-amber text-amber" : ""
            }`}
          />
          {isWatched(ticker.ticker) ? "Watching" : "Watch"}
        </button>
      </div>

      {/* Company info */}
      <CompanyInfoCard ticker={ticker} />

      {/* Quick stats bar */}
      <QuickStats ticker={ticker.ticker} />

      {/* Chart + sidebar layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <PriceChartPanel ticker={ticker.ticker} />
          <Suspense fallback={<Skeleton className="h-64" />}>
            <BacktestPanel ticker={ticker.ticker} />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-48" />}>
            <SignalHistoryCard ticker={ticker.ticker} />
          </Suspense>
        </div>
        <div className="space-y-6">
          <TechnicalSummary ticker={ticker} indicators={indicators} />
          <SeasonalTrendsCard ticker={ticker.ticker} />
          <IndicatorPanel ticker={ticker.ticker} />
          <SectorPeersPanel ticker={ticker} />
        </div>
      </div>
    </div>
  );
}
