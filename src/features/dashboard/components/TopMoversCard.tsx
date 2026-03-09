import { memo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Star, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { useSparkline } from "@/api/hooks/useCompare";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useToast } from "@/components/ui/Toast";
import type { Mover } from "@/api/types/market";
import { formatCurrency, formatPercent } from "@/lib/formatters";

interface TopMoversCardProps {
  gainers: Mover[];
  losers: Mover[];
}

const SparkCell = memo(function SparkCell({ ticker, isGain }: { ticker: string; isGain: boolean }) {
  const { data } = useSparkline(ticker, 7);
  if (!data) return <div className="h-[24px] w-14" />;
  return (
    <div className="w-14">
      <MiniSparkline
        data={data.closes.map((v) => ({ value: v }))}
        color={isGain ? "#22c55e" : "#ef4444"}
        height={24}
      />
    </div>
  );
});

const MoverRow = memo(function MoverRow({ mover }: { mover: Mover }) {
  const { toggle, isWatched } = useWatchlist();
  const { show: showToast } = useToast();
  const isGain = mover.change_pct >= 0;

  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-bg-hover">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            const wasWatched = isWatched(mover.ticker);
            toggle(mover.ticker);
            showToast(wasWatched ? `${mover.ticker} removed from watchlist` : `${mover.ticker} added to watchlist`);
          }}
          aria-label={isWatched(mover.ticker) ? `Remove ${mover.ticker} from watchlist` : `Add ${mover.ticker} to watchlist`}
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:text-amber hover:bg-bg-hover transition-colors"
        >
          <Star className={`h-4 w-4 ${isWatched(mover.ticker) ? "fill-amber text-amber" : ""}`} />
        </button>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            isGain ? "bg-green/10" : "bg-red/10"
          }`}
        >
          {isGain ? (
            <TrendingUp className="h-4 w-4 text-green" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red" />
          )}
        </div>
        <Link to={`/ticker/${mover.ticker}`} className="flex items-center gap-2">
          <div>
            <p className="text-sm font-medium text-text-primary">{mover.ticker}</p>
            <p className="max-w-[100px] truncate text-xs text-text-muted">
              {mover.name ?? mover.sector}
            </p>
          </div>
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <SparkCell ticker={mover.ticker} isGain={isGain} />
        <div className="text-right">
          <p className="text-sm text-text-primary">
            {formatCurrency(mover.close)}
          </p>
          <Badge variant={isGain ? "green" : "red"}>
            {formatPercent(mover.change_pct)}
          </Badge>
        </div>
      </div>
    </div>
  );
});

export function TopMoversCard({ gainers, losers }: TopMoversCardProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Top Gainers" subtitle="Biggest daily gains">
        <div className="-mx-3 space-y-0.5">
          {gainers.slice(0, 10).map((m) => (
            <MoverRow key={m.ticker} mover={m} />
          ))}
        </div>
        <Link
          to="/screener?sort_by=change&sort_dir=desc"
          className="mt-3 flex items-center justify-center gap-1 text-xs text-accent hover:underline"
        >
          View all in screener <ArrowRight className="h-3 w-3" />
        </Link>
      </Card>
      <Card title="Top Losers" subtitle="Biggest daily drops">
        <div className="-mx-3 space-y-0.5">
          {losers.slice(0, 10).map((m) => (
            <MoverRow key={m.ticker} mover={m} />
          ))}
        </div>
        <Link
          to="/screener?sort_by=change&sort_dir=asc"
          className="mt-3 flex items-center justify-center gap-1 text-xs text-accent hover:underline"
        >
          View all in screener <ArrowRight className="h-3 w-3" />
        </Link>
      </Card>
    </div>
  );
}
