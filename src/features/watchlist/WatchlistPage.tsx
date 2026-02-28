import { Link } from "react-router-dom";
import { Star, TrendingUp, TrendingDown, Inbox } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useTicker } from "@/api/hooks/useTickers";
import { useLatestIndicators } from "@/api/hooks/useIndicators";
import { useSparkline } from "@/api/hooks/useCompare";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { formatCurrency } from "@/lib/formatters";

function WatchlistRow({ ticker, onRemove }: { ticker: string; onRemove: () => void }) {
  const { data: detail, isLoading } = useTicker(ticker);
  const { data: indicators } = useLatestIndicators(ticker);
  const { data: sparkline } = useSparkline(ticker, 7);

  if (isLoading) return <Skeleton className="h-14" />;
  if (!detail) return null;

  const rsi = indicators?.indicators?.RSI_14;

  const sparkColor =
    sparkline && sparkline.closes.length > 1
      ? sparkline.closes[sparkline.closes.length - 1] >= sparkline.closes[0]
        ? "#22c55e"
        : "#ef4444"
      : "#6366f1";

  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-bg-hover">
      <div className="flex items-center gap-3">
        <button onClick={onRemove} className="text-amber hover:text-amber/70">
          <Star className="h-4 w-4 fill-amber" />
        </button>
        <Link to={`/ticker/${ticker}`} className="flex items-center gap-3">
          <div>
            <p className="text-sm font-medium text-accent">{ticker}</p>
            <p className="max-w-[160px] truncate text-xs text-text-muted">
              {detail.name}
            </p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Sparkline */}
        {sparkline && (
          <div className="w-20">
            <MiniSparkline
              data={sparkline.closes.map((v) => ({ value: v }))}
              color={sparkColor}
              height={28}
            />
          </div>
        )}

        {/* Price */}
        <div className="text-right">
          <p className="text-sm text-text-primary">
            {detail.latest_close ? formatCurrency(detail.latest_close) : "—"}
          </p>
          <p className="text-xs text-text-muted">{detail.sector}</p>
        </div>

        {/* RSI */}
        <div className="w-16 text-right">
          {rsi != null ? (
            <Badge variant={rsi < 30 ? "green" : rsi > 70 ? "red" : "default"}>
              RSI {rsi.toFixed(0)}
            </Badge>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          )}
        </div>

        {/* Signal */}
        <div className="w-20 text-right">
          {rsi != null ? (
            rsi < 30 ? (
              <Badge variant="green">
                <TrendingUp className="mr-1 h-3 w-3" />
                Oversold
              </Badge>
            ) : rsi > 70 ? (
              <Badge variant="red">
                <TrendingDown className="mr-1 h-3 w-3" />
                Overbought
              </Badge>
            ) : (
              <Badge variant="default">Neutral</Badge>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function WatchlistPage() {
  const { watchlist, remove } = useWatchlist();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Watchlist</h1>
        <p className="mt-1 text-sm text-text-muted">
          Your starred stocks — data persists in your browser
        </p>
      </div>

      {watchlist.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Inbox className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">Your watchlist is empty</p>
            <p className="mt-1 text-xs">
              Star stocks from the{" "}
              <Link to="/" className="text-accent hover:underline">
                Dashboard
              </Link>{" "}
              or{" "}
              <Link to="/screener" className="text-accent hover:underline">
                Screener
              </Link>{" "}
              to add them here
            </p>
          </div>
        </Card>
      ) : (
        <Card
          title={`${watchlist.length} Stock${watchlist.length === 1 ? "" : "s"}`}
          subtitle="Click star to remove"
        >
          <div className="-mx-3 space-y-0.5">
            {watchlist.map((ticker) => (
              <WatchlistRow
                key={ticker}
                ticker={ticker}
                onRemove={() => remove(ticker)}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
