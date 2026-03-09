import { memo } from "react";
import { Link } from "react-router-dom";
import { Clock, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { useSparkline } from "@/api/hooks/useCompare";
import { formatCurrency, formatPercent } from "@/lib/formatters";

const RECENT_KEY = "peakdipvibe-recent-searches";

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

const RecentTickerRow = memo(function RecentTickerRow({
  ticker,
}: {
  ticker: string;
}) {
  const { data } = useSparkline(ticker, 7);
  const closes = data?.closes ?? [];
  const lastPrice = closes.length > 0 ? closes[closes.length - 1] : null;
  const firstPrice = closes.length > 1 ? closes[0] : null;
  const changePct =
    lastPrice != null && firstPrice != null && firstPrice !== 0
      ? ((lastPrice - firstPrice) / firstPrice) * 100
      : null;
  const isPositive = changePct != null && changePct >= 0;
  const color = isPositive ? "#22c55e" : "#ef4444";

  return (
    <Link
      to={`/ticker/${ticker}`}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-bg-hover"
    >
      <span className="w-[52px] shrink-0 text-sm font-semibold text-accent">
        {ticker}
      </span>
      <div className="w-14">
        {closes.length >= 2 ? (
          <MiniSparkline
            data={closes.map((v) => ({ value: v }))}
            color={color}
            height={24}
          />
        ) : (
          <div className="h-[24px]" />
        )}
      </div>
      <span className="min-w-0 flex-1" />
      <span className="shrink-0 text-sm text-text-primary">
        {lastPrice != null ? formatCurrency(lastPrice) : "—"}
      </span>
      {changePct != null ? (
        <Badge variant={isPositive ? "green" : "red"}>
          {formatPercent(changePct)}
        </Badge>
      ) : (
        <span className="w-[60px]" />
      )}
    </Link>
  );
});

export function RecentlyViewedCard() {
  const recentTickers = loadRecent();

  if (recentTickers.length === 0) {
    return (
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">
            Recently Viewed
          </h3>
        </div>
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Search className="h-6 w-6 text-text-muted" />
          <p className="text-sm text-text-muted">
            No recent searches yet
          </p>
          <p className="text-xs text-text-muted">
            Use the search bar or <Link to="/screener" className="text-accent hover:underline">browse the screener</Link> to find stocks
          </p>
        </div>
      </Card>
    );
  }

  const tickers = recentTickers.slice(0, 6);

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">
          Recently Viewed
        </h3>
        <span className="text-xs text-text-muted">7d performance</span>
      </div>
      <div className="grid gap-0.5">
        {tickers.map((ticker) => (
          <RecentTickerRow key={ticker} ticker={ticker} />
        ))}
      </div>
    </Card>
  );
}
