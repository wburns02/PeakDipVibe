import type { RiskCluster } from "../lib/correlation";
import { Link } from "react-router-dom";

interface Props {
  clusters: RiskCluster[];
}

const CLUSTER_COLORS = ["#6366f1", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16", "#f97316"];

export function RiskClusters({ clusters }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5">
      <h3 className="text-sm font-semibold text-text-primary">Risk Clusters</h3>
      <p className="text-xs text-text-muted">Stocks that move together share the same risk</p>

      <div className="mt-4 space-y-3">
        {clusters.map((c, i) => {
          const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
          const isMulti = c.tickers.length > 1;
          return (
            <div
              key={c.id}
              className="rounded-xl border p-3 transition-colors"
              style={{
                borderColor: isMulti ? color + "40" : "var(--color-border)",
                backgroundColor: isMulti ? color + "08" : "transparent",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
                    style={{ backgroundColor: color + "25", color }}
                  >
                    {c.tickers.length}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.tickers.map((t) => (
                      <Link
                        key={t}
                        to={`/ticker/${t}`}
                        className="rounded-md bg-bg-secondary px-2 py-0.5 text-xs font-semibold text-accent transition-colors hover:bg-bg-hover"
                      >
                        {t}
                      </Link>
                    ))}
                  </div>
                </div>
                {isMulti && (
                  <span className="text-xs font-mono font-semibold" style={{ color }}>
                    r={c.avgCorrelation.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-text-muted">{c.label}</p>
            </div>
          );
        })}
      </div>

      {clusters.filter((c) => c.tickers.length > 1).length === 0 && (
        <div className="mt-3 rounded-lg bg-green/10 p-2.5">
          <p className="text-xs font-medium text-green">
            No risk clusters detected — each stock moves independently
          </p>
        </div>
      )}
    </div>
  );
}
