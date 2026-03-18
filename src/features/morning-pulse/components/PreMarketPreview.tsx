import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  Trophy,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { usePremarket } from "@/api/hooks/usePremarket";
import { Skeleton } from "@/components/ui/Skeleton";

export function PreMarketPreview() {
  const { data, isLoading } = usePremarket();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Futures */}
      {data.futures.length > 0 && (
        <section className="pulse-section rounded-2xl border border-border bg-bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-text-primary">
              Overnight Futures
            </h3>
            <span className="ml-auto text-xs text-text-muted">Live</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.futures.map((f) => {
              const up = f.change_pct >= 0;
              return (
                <div
                  key={f.symbol}
                  className={`flex items-center justify-between rounded-xl border p-4 ${
                    up
                      ? "border-green/20 bg-green/5"
                      : "border-red/20 bg-red/5"
                  }`}
                >
                  <div>
                    <p className="text-xs text-text-muted">{f.name}</p>
                    <p className="text-lg font-bold text-text-primary">
                      {f.price.toLocaleString()}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 ${up ? "text-green" : "text-red"}`}>
                    {up ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span className="text-sm font-semibold">
                      {up ? "+" : ""}
                      {f.change_pct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-text-muted">
            Futures show where the market is expected to open — green means up, red means down
          </p>
        </section>
      )}

      {/* Yesterday's Recap */}
      {data.yesterday.breadth && (
        <section className="pulse-section rounded-2xl border border-border bg-bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber" />
            <h3 className="text-sm font-semibold text-text-primary">
              Last Close Recap
            </h3>
            <span className="ml-auto text-xs text-text-muted">
              {data.yesterday.date}
            </span>
          </div>

          {/* Breadth mini-stats */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                label: "Advancers",
                value: data.yesterday.breadth.advancers.toString(),
                color: "text-green",
              },
              {
                label: "Decliners",
                value: data.yesterday.breadth.decliners.toString(),
                color: "text-red",
              },
              {
                label: "A/D Ratio",
                value: data.yesterday.breadth.advance_decline_ratio.toFixed(2),
                color:
                  data.yesterday.breadth.advance_decline_ratio >= 1
                    ? "text-green"
                    : "text-red",
              },
              {
                label: "Avg RSI",
                value: data.yesterday.breadth.avg_rsi?.toFixed(1) ?? "—",
                color: "text-text-primary",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg bg-bg-hover p-2.5 text-center"
              >
                <p className="text-xs text-text-muted">{s.label}</p>
                <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Top movers */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Gainers */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-green">
                <TrendingUp className="h-3 w-3" /> Top Gainers
              </p>
              <div className="space-y-1">
                {data.yesterday.gainers.map((g) => (
                  <Link
                    key={g.ticker}
                    to={`/ticker/${g.ticker}`}
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-bg-hover"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-accent">
                        {g.ticker}
                      </span>
                      <span className="truncate text-xs text-text-muted">
                        {g.name}
                      </span>
                    </div>
                    <span className="font-medium text-green">
                      +{g.change_pct.toFixed(1)}%
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Losers */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-red">
                <TrendingDown className="h-3 w-3" /> Top Losers
              </p>
              <div className="space-y-1">
                {data.yesterday.losers.map((l) => (
                  <Link
                    key={l.ticker}
                    to={`/ticker/${l.ticker}`}
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-bg-hover"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-accent">
                        {l.ticker}
                      </span>
                      <span className="truncate text-xs text-text-muted">
                        {l.name}
                      </span>
                    </div>
                    <span className="font-medium text-red">
                      {l.change_pct.toFixed(1)}%
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Stocks to Watch */}
      {(data.watch.oversold.length > 0 || data.watch.overbought.length > 0) && (
        <section className="pulse-section rounded-2xl border border-border bg-bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Eye className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-text-primary">
              Stocks to Watch Today
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Oversold — bounce candidates */}
            {data.watch.oversold.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-green">
                  <AlertTriangle className="h-3 w-3" /> Oversold — Bounce
                  Candidates
                </p>
                <p className="mb-2 text-xs text-text-muted">
                  These stocks fell a lot recently and might bounce back
                </p>
                <div className="space-y-1">
                  {data.watch.oversold.map((s) => (
                    <Link
                      key={s.ticker}
                      to={`/ticker/${s.ticker}`}
                      className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-bg-hover"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-accent">
                          {s.ticker}
                        </span>
                        <span className="truncate text-xs text-text-muted">
                          {s.name}
                        </span>
                      </div>
                      <span className="rounded bg-green/10 px-1.5 py-0.5 text-xs font-medium text-green">
                        RSI {s.rsi}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Overbought — stretched stocks */}
            {data.watch.overbought.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber">
                  <TrendingUp className="h-3 w-3" /> Overbought — Might Need a
                  Rest
                </p>
                <p className="mb-2 text-xs text-text-muted">
                  These stocks ran up a lot and could pull back soon
                </p>
                <div className="space-y-1">
                  {data.watch.overbought.map((s) => (
                    <Link
                      key={s.ticker}
                      to={`/ticker/${s.ticker}`}
                      className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-bg-hover"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-accent">
                          {s.ticker}
                        </span>
                        <span className="truncate text-xs text-text-muted">
                          {s.name}
                        </span>
                      </div>
                      <span className="rounded bg-amber/10 px-1.5 py-0.5 text-xs font-medium text-amber">
                        RSI {s.rsi}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex justify-center">
            <Link
              to="/screener"
              className="flex items-center gap-1 text-sm text-accent hover:underline"
            >
              Search for more stocks <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
