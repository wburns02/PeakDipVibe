import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useCompare } from "@/api/hooks/useCompare";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api } from "@/api/client";
import { TickerDetailSchema } from "@/api/types/ticker";
import { Skeleton } from "@/components/ui/Skeleton";
import { CorrelationHeatmap } from "./components/CorrelationHeatmap";
import { DiversificationScore } from "./components/DiversificationScore";
import { SectorConcentration } from "./components/SectorConcentration";
import { RiskClusters } from "./components/RiskClusters";
import { PairInsights } from "./components/PairInsights";
import {
  computeCorrelationMatrix,
  computeSectorExposure,
  findPairInsights,
  detectClusters,
} from "./lib/correlation";
import { Scan, Info, Plus, ArrowRight } from "lucide-react";

export function PortfolioXrayPage() {
  usePageTitle("Portfolio X-Ray");

  const { watchlist } = useWatchlist();
  const [lookback, setLookback] = useState<90 | 180 | 252>(90);
  const [showGuide, setShowGuide] = useState(false);

  // Fetch aligned price data for correlation computation
  const { data: compareData, isLoading: compareLoading } = useCompare(watchlist, lookback);

  // Fetch ticker details for sector info
  const tickerQueries = useQueries({
    queries: watchlist.map((ticker) => ({
      queryKey: ["ticker-detail", ticker],
      queryFn: async () => {
        const { data } = await api.get(`/tickers/${ticker}`);
        return TickerDetailSchema.parse(data);
      },
      staleTime: 5 * 60 * 1000,
    })),
  });

  const tickerDetails = useMemo(() => {
    const map: Record<string, { sector: string; name: string; changePct: number }> = {};
    for (const q of tickerQueries) {
      if (q.data) {
        const d = q.data;
        map[d.ticker] = {
          sector: d.sector ?? "Unknown",
          name: d.name ?? d.ticker,
          changePct: d.indicators?.ROC_10 ?? 0,
        };
      }
    }
    return map;
  }, [tickerQueries]);

  const detailsLoading = tickerQueries.some((q) => q.isLoading);
  const isLoading = compareLoading || detailsLoading;

  // Compute all analytics
  const corrMatrix = useMemo(() => {
    if (!compareData) return null;
    return computeCorrelationMatrix(compareData);
  }, [compareData]);

  const sectorExposure = useMemo(() => {
    const sectorMap: Record<string, string> = {};
    for (const [ticker, detail] of Object.entries(tickerDetails)) {
      sectorMap[ticker] = detail.sector;
    }
    return computeSectorExposure(sectorMap);
  }, [tickerDetails]);

  const pairInsights = useMemo(() => {
    if (!corrMatrix) return [];
    const recentReturns: Record<string, number> = {};
    for (const [ticker, detail] of Object.entries(tickerDetails)) {
      recentReturns[ticker] = detail.changePct;
    }
    return findPairInsights(corrMatrix, recentReturns);
  }, [corrMatrix, tickerDetails]);

  const clusters = useMemo(() => {
    if (!corrMatrix) return [];
    return detectClusters(corrMatrix);
  }, [corrMatrix]);

  // Empty state
  if (watchlist.length < 2) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Scan className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Portfolio X-Ray</h1>
            <p className="text-sm text-text-muted">
              Correlation intelligence for your watchlist
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-bg-card py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mb-4">
            <Plus className="h-8 w-8 text-accent" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">Add at least 2 stocks</h2>
          <p className="mt-1 max-w-sm text-sm text-text-muted">
            Portfolio X-Ray needs at least 2 watchlist stocks to compute correlations and risk metrics.
            You have {watchlist.length === 0 ? "none" : "only 1"} right now.
          </p>
          <Link
            to="/screener"
            className="mt-4 flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/80"
          >
            Find stocks in Screener
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Scan className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Portfolio X-Ray</h1>
            <p className="text-sm text-text-muted">
              Correlation intelligence &mdash; {watchlist.length} stocks analyzed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Lookback selector */}
          <div className="flex items-center rounded-lg border border-border bg-bg-secondary">
            {([90, 180, 252] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setLookback(days)}
                className={`px-3 py-2.5 text-sm font-medium transition-colors ${
                  lookback === days
                    ? "bg-accent/15 text-accent"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {days === 90 ? "3M" : days === 180 ? "6M" : "1Y"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-3 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-accent/30 hover:text-text-primary"
          >
            <Info className="h-3.5 w-3.5" />
            Guide
          </button>
        </div>
      </div>

      {/* Guide */}
      {showGuide && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-2 animate-slideDown">
          <h3 className="text-sm font-semibold text-text-primary">Reading the X-Ray</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs leading-relaxed text-text-secondary">
            <div>
              <strong className="text-text-primary">Correlation Heatmap</strong> — Shows how each pair of stocks moves together.
              <span className="text-red"> Red = high correlation</span> (same risk),
              <span className="text-blue-400"> Blue = negative</span> (natural hedge).
            </div>
            <div>
              <strong className="text-text-primary">Diversification Score</strong> — 0-100 rating based on average pairwise correlation.
              Higher is better. A score below 50 means your stocks are too similar.
            </div>
            <div>
              <strong className="text-text-primary">Risk Clusters</strong> — Groups of stocks that move together.
              If one stock in a cluster drops, the others likely will too.
            </div>
            <div>
              <strong className="text-text-primary">Pair Insights</strong> — Highlights correlated pairs that have recently
              diverged (potential mean reversion) or negatively correlated pairs (natural hedges).
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-[400px] rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      )}

      {/* Main content */}
      {!isLoading && corrMatrix && (
        <>
          {/* Top: Score + Sector side by side */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DiversificationScore data={corrMatrix} />
            <SectorConcentration sectors={sectorExposure} />
          </div>

          {/* Correlation Heatmap */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
              Correlation Matrix ({lookback === 90 ? "3 months" : lookback === 180 ? "6 months" : "1 year"})
            </h2>
            <CorrelationHeatmap data={corrMatrix} />
          </div>

          {/* Clusters + Pair Insights */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RiskClusters clusters={clusters} />
            <PairInsights insights={pairInsights} />
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickStat
              label="Stocks Analyzed"
              value={String(corrMatrix.tickers.length)}
            />
            <QuickStat
              label="Lookback Days"
              value={String(lookback)}
            />
            <QuickStat
              label="Risk Clusters"
              value={String(clusters.filter((c) => c.tickers.length > 1).length)}
            />
            <QuickStat
              label="Sectors"
              value={String(sectorExposure.length)}
            />
          </div>
        </>
      )}
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-text-primary">{value}</p>
    </div>
  );
}
