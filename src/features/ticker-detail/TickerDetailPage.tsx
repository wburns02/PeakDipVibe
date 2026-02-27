import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTicker } from "@/api/hooks/useTickers";
import { useLatestIndicators } from "@/api/hooks/useIndicators";
import { Skeleton } from "@/components/ui/Skeleton";
import { CompanyInfoCard } from "./components/CompanyInfoCard";
import { PriceChartPanel } from "./components/PriceChartPanel";
import { IndicatorPanel } from "./components/IndicatorPanel";
import { TechnicalSummary } from "./components/TechnicalSummary";

export function TickerDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const { data: ticker, isLoading, error } = useTicker(symbol ?? "");
  const { data: indicators } = useLatestIndicators(symbol ?? "");

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
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="rounded-xl border border-border bg-bg-card p-12 text-center">
          <p className="text-lg font-semibold text-text-primary">
            Ticker not found
          </p>
          <p className="mt-1 text-sm text-text-muted">
            "{symbol}" doesn't exist in the S&P 500 database
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back button */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Company info */}
      <CompanyInfoCard ticker={ticker} />

      {/* Chart + sidebar layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <PriceChartPanel ticker={ticker.ticker} />
        </div>
        <div className="space-y-6">
          <TechnicalSummary ticker={ticker} indicators={indicators} />
          <IndicatorPanel ticker={ticker.ticker} />
        </div>
      </div>
    </div>
  );
}
