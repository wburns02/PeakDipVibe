import type { PairInsight } from "../lib/correlation";
import { Link } from "react-router-dom";
import { ArrowRightLeft, Shield, TrendingDown } from "lucide-react";

interface Props {
  insights: PairInsight[];
}

const TYPE_META: Record<PairInsight["type"], { icon: typeof ArrowRightLeft; color: string; bg: string }> = {
  "high-corr-diverged": { icon: ArrowRightLeft, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  "negative-corr": { icon: Shield, color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  "low-corr": { icon: TrendingDown, color: "#94a3b8", bg: "rgba(148,163,184,0.08)" },
};

export function PairInsights({ insights }: Props) {
  if (insights.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-5">
        <h3 className="text-sm font-semibold text-text-primary">Pair Insights</h3>
        <p className="text-[11px] text-text-muted">Notable relationships between your stocks</p>
        <div className="mt-6 flex flex-col items-center py-4 text-center">
          <ArrowRightLeft className="mb-2 h-8 w-8 text-text-muted/30" />
          <p className="text-xs text-text-muted">
            No notable pair insights found.<br />
            Add more stocks to your watchlist for richer analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5">
      <h3 className="text-sm font-semibold text-text-primary">Pair Insights</h3>
      <p className="text-[11px] text-text-muted">Notable relationships between your stocks</p>

      <div className="mt-4 space-y-2">
        {insights.map((p) => {
          const meta = TYPE_META[p.type];
          const Icon = meta.icon;
          return (
            <div
              key={`${p.tickerA}-${p.tickerB}`}
              className="rounded-xl border border-border p-3 transition-colors hover:border-border"
              style={{ backgroundColor: meta.bg }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: meta.color + "20" }}
                >
                  <Icon className="h-4 w-4" style={{ color: meta.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/ticker/${p.tickerA}`}
                      className="text-xs font-bold text-accent hover:underline"
                    >
                      {p.tickerA}
                    </Link>
                    <span className="text-text-muted">&harr;</span>
                    <Link
                      to={`/ticker/${p.tickerB}`}
                      className="text-xs font-bold text-accent hover:underline"
                    >
                      {p.tickerB}
                    </Link>
                    <span
                      className="ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-mono font-semibold"
                      style={{ backgroundColor: meta.color + "18", color: meta.color }}
                    >
                      r={p.correlation > 0 ? "+" : ""}{p.correlation.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-text-muted">{p.label}</p>
                  {p.type === "high-corr-diverged" && (
                    <p className="mt-0.5 text-[10px] font-medium text-amber-400">
                      Return spread: {p.divergence.toFixed(1)}% — watch for convergence
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
