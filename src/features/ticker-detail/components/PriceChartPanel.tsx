import { useState, useMemo, lazy, Suspense } from "react";
import { useChartData } from "@/api/hooks/usePrices";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { CHART_COLORS } from "@/lib/colors";

const CandlestickChart = lazy(() =>
  import("@/components/charts/CandlestickChart").then((m) => ({ default: m.CandlestickChart }))
);

interface PriceChartPanelProps {
  ticker: string;
}

const TIME_RANGES = [
  { label: "1M", days: 22 },
  { label: "3M", days: 66 },
  { label: "6M", days: 132 },
  { label: "1Y", days: 252 },
  { label: "5Y", days: 1260 },
  { label: "All", days: 5000 },
] as const;

const OVERLAY_OPTIONS = [
  { key: "sma50", label: "SMA 50", color: CHART_COLORS.sma50 },
  { key: "sma200", label: "SMA 200", color: CHART_COLORS.sma200 },
  { key: "ema12", label: "EMA 12", color: CHART_COLORS.ema12 },
  { key: "bb", label: "Bollinger", color: CHART_COLORS.bbMiddle },
] as const;

type OverlayKey = (typeof OVERLAY_OPTIONS)[number]["key"];

export function PriceChartPanel({ ticker }: PriceChartPanelProps) {
  const [range, setRange] = useState(3); // 1Y default
  const [activeOverlays, setActiveOverlays] = useState<Set<OverlayKey>>(
    new Set(["sma50"])
  );

  const limit = TIME_RANGES[range].days;
  const { data, isLoading } = useChartData(ticker, { limit });

  const overlays = useMemo(
    () =>
      Object.fromEntries(
        OVERLAY_OPTIONS.map(({ key }) => [key, activeOverlays.has(key)])
      ) as Record<OverlayKey, boolean>,
    [activeOverlays]
  );

  const toggleOverlay = (key: OverlayKey) => {
    setActiveOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Card>
      {/* Controls */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {/* Time range */}
        <div className="flex gap-1">
          {TIME_RANGES.map((r, i) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setRange(i)}
              aria-label={`Show ${r.label} time range`}
              aria-pressed={i === range}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                i === range
                  ? "bg-accent text-white"
                  : "text-text-muted hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Overlay toggles */}
        <div className="flex gap-1">
          {OVERLAY_OPTIONS.map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleOverlay(key)}
              aria-label={`Toggle ${label} overlay`}
              aria-pressed={activeOverlays.has(key)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
                activeOverlays.has(key)
                  ? "bg-bg-hover text-text-primary"
                  : "text-text-muted hover:bg-bg-hover hover:text-text-secondary"
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <Skeleton className="h-[500px]" />
      ) : data && data.length > 0 ? (
        <Suspense fallback={<Skeleton className="h-[500px]" />}>
          <CandlestickChart data={data} overlays={overlays} />
        </Suspense>
      ) : (
        <div className="flex h-[500px] items-center justify-center text-text-muted">
          No price data available
        </div>
      )}
    </Card>
  );
}
