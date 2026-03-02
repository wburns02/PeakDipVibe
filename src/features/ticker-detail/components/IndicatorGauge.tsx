import { getIndicatorMeta, getZone } from "@/lib/indicators";
import { formatNumber, formatVolume } from "@/lib/formatters";
import { IndicatorExplainer } from "@/components/education/IndicatorExplainer";

const LARGE_VALUE_INDICATORS = new Set(["OBV"]);

interface IndicatorGaugeProps {
  indicatorKey: string;
  value: number | null;
}

export function IndicatorGauge({ indicatorKey, value }: IndicatorGaugeProps) {
  const meta = getIndicatorMeta(indicatorKey);
  const zone = value != null ? getZone(meta, value) : undefined;

  // For RSI and %B, we can show a visual gauge
  const showGauge =
    meta.zones &&
    (indicatorKey === "RSI_14" || indicatorKey === "BBANDS_PCTB");

  const gaugePercent =
    indicatorKey === "RSI_14"
      ? ((value ?? 50) / 100) * 100
      : indicatorKey === "BBANDS_PCTB"
        ? Math.max(0, Math.min(100, ((value ?? 0.5) / 1) * 100))
        : 50;

  const zoneColors: Record<string, string> = {
    emerald: "text-green",
    slate: "text-text-secondary",
    red: "text-red",
  };

  return (
    <div className="rounded-lg border border-border bg-bg-secondary p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-xs font-medium text-text-secondary">
            {meta.shortName}
          </span>
          <IndicatorExplainer indicatorKey={indicatorKey} value={value} />
        </div>
        <span className="text-sm font-semibold text-text-primary">
          {value != null
            ? LARGE_VALUE_INDICATORS.has(indicatorKey)
              ? formatVolume(value)
              : formatNumber(value)
            : "—"}
        </span>
      </div>

      {showGauge && (
        <div className="mt-2">
          {/* Gauge bar */}
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-bg-hover">
            {/* Zone backgrounds */}
            {indicatorKey === "RSI_14" && (
              <>
                <div className="absolute left-0 top-0 h-full w-[30%] bg-green/20" />
                <div className="absolute left-[30%] top-0 h-full w-[40%] bg-text-muted/10" />
                <div className="absolute left-[70%] top-0 h-full w-[30%] bg-red/20" />
              </>
            )}
            {/* Pointer */}
            <div
              className="absolute top-0 h-full w-1 rounded-full bg-accent shadow-sm shadow-accent/50"
              style={{ left: `${Math.max(0, Math.min(100, gaugePercent))}%` }}
            />
          </div>

          {/* Zone label */}
          {zone && (
            <p
              className={`mt-1 text-[10px] font-medium ${zoneColors[zone.color] ?? "text-text-muted"}`}
            >
              {zone.label}
            </p>
          )}
        </div>
      )}

      {/* Non-gauge zone labels */}
      {!showGauge && zone && (
        <p
          className={`mt-1 text-[10px] font-medium ${zoneColors[zone.color] ?? "text-text-muted"}`}
        >
          {zone.label}
        </p>
      )}
    </div>
  );
}
