import { useMemo } from "react";
import { usePriceHistory } from "@/api/hooks/usePrices";
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp, BarChart2, Activity } from "lucide-react";

interface QuickStatsProps {
  ticker: string;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtVol(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}

export function QuickStats({ ticker }: QuickStatsProps) {
  const { data: prices } = usePriceHistory(ticker, { limit: 252 });

  const stats = useMemo(() => {
    if (!prices || prices.length < 2) return null;

    const highs = prices.map((p) => p.high).filter((v): v is number => v != null);
    const lows = prices.map((p) => p.low).filter((v): v is number => v != null);
    const volumes = prices.map((p) => p.volume).filter((v): v is number => v != null);
    const closes = prices.map((p) => p.close).filter((v): v is number => v != null);

    const high52 = highs.length > 0 ? Math.max(...highs) : null;
    const low52 = lows.length > 0 ? Math.min(...lows) : null;
    const avgVol = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : null;

    const latest = closes[closes.length - 1];
    const prev = closes[closes.length - 2];
    const dailyChange = latest != null && prev != null && prev !== 0 ? ((latest - prev) / prev) * 100 : null;

    // Distance from 52-week high
    const fromHigh = latest != null && high52 != null && high52 !== 0 ? ((latest - high52) / high52) * 100 : null;

    return { high52, low52, avgVol, latest, dailyChange, fromHigh };
  }, [prices]);

  if (!stats) return null;

  return (
    <div className="flex flex-wrap gap-3 sm:gap-4">
      {/* 52-Week High */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-2">
        <TrendingUp className="h-3.5 w-3.5 text-green" />
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-text-muted">52W High</p>
          <p className="text-sm font-semibold text-text-primary">{fmt(stats.high52)}</p>
        </div>
      </div>

      {/* 52-Week Low */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-2">
        <TrendingDown className="h-3.5 w-3.5 text-red" />
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-text-muted">52W Low</p>
          <p className="text-sm font-semibold text-text-primary">{fmt(stats.low52)}</p>
        </div>
      </div>

      {/* From High */}
      {stats.fromHigh != null && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-2">
          {stats.fromHigh >= 0 ? (
            <ArrowUp className="h-3.5 w-3.5 text-green" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-red" />
          )}
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-text-muted">From High</p>
            <p className={`text-sm font-semibold ${stats.fromHigh >= 0 ? "text-green" : "text-red"}`}>
              {stats.fromHigh >= 0 ? "+" : ""}{stats.fromHigh.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Avg Volume */}
      {stats.avgVol != null && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-2">
          <BarChart2 className="h-3.5 w-3.5 text-accent" />
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-text-muted">Avg Vol</p>
            <p className="text-sm font-semibold text-text-primary">{fmtVol(stats.avgVol)}</p>
          </div>
        </div>
      )}

      {/* Daily Change */}
      {stats.dailyChange != null && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-2">
          <Activity className="h-3.5 w-3.5 text-amber" />
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-text-muted">Day Chg</p>
            <p className={`text-sm font-semibold ${stats.dailyChange >= 0 ? "text-green" : "text-red"}`}>
              {stats.dailyChange >= 0 ? "+" : ""}{stats.dailyChange.toFixed(2)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
