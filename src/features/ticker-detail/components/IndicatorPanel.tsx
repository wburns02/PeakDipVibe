import { useLatestIndicators } from "@/api/hooks/useIndicators";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { IndicatorGauge } from "./IndicatorGauge";

interface IndicatorPanelProps {
  ticker: string;
}

// Group indicators logically for display
const INDICATOR_GROUPS = [
  {
    title: "Momentum",
    keys: ["RSI_14", "MACD", "MACD_SIGNAL", "MACD_HIST"],
  },
  {
    title: "Moving Averages",
    keys: ["SMA_10", "SMA_20", "SMA_50", "SMA_200", "EMA_12", "EMA_50"],
  },
  {
    title: "Bollinger Bands",
    keys: ["BBANDS_UPPER", "BBANDS_MIDDLE", "BBANDS_LOWER", "BBANDS_WIDTH", "BBANDS_PCTB"],
  },
  {
    title: "Volatility & Volume",
    keys: ["ATR_14", "OBV", "ROC_10", "ROC_20"],
  },
];

export function IndicatorPanel({ ticker }: IndicatorPanelProps) {
  const { data, isLoading } = useLatestIndicators(ticker);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!data || Object.keys(data.indicators).length === 0) {
    return (
      <Card>
        <p className="py-4 text-center text-sm text-text-muted">
          Technical indicators require at least 200 days of price history. This ticker may be newly added to the pipeline.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {INDICATOR_GROUPS.map(({ title, keys }) => {
        const available = keys.filter((k) => data.indicators[k] != null);
        if (available.length === 0) return null;

        return (
          <Card key={title} title={title} subtitle={`as of ${data.date}`}>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {available.map((key) => (
                <IndicatorGauge
                  key={key}
                  indicatorKey={key}
                  value={data.indicators[key] ?? null}
                />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
