import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Mover } from "@/api/types/market";
import { formatCurrency, formatPercent } from "@/lib/formatters";

interface TopMoversCardProps {
  gainers: Mover[];
  losers: Mover[];
}

function MoverRow({ mover }: { mover: Mover }) {
  const isGain = mover.change_pct >= 0;

  return (
    <Link
      to={`/ticker/${mover.ticker}`}
      className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-bg-hover"
    >
      <div className="flex items-center gap-3">
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
        <div>
          <p className="text-sm font-medium text-text-primary">{mover.ticker}</p>
          <p className="max-w-[140px] truncate text-xs text-text-muted">
            {mover.name ?? mover.sector}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-text-primary">
          {formatCurrency(mover.close)}
        </p>
        <Badge variant={isGain ? "green" : "red"}>
          {formatPercent(mover.change_pct)}
        </Badge>
      </div>
    </Link>
  );
}

export function TopMoversCard({ gainers, losers }: TopMoversCardProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Top Gainers" subtitle="Biggest daily gains">
        <div className="-mx-3 space-y-0.5">
          {gainers.slice(0, 10).map((m) => (
            <MoverRow key={m.ticker} mover={m} />
          ))}
        </div>
      </Card>
      <Card title="Top Losers" subtitle="Biggest daily drops">
        <div className="-mx-3 space-y-0.5">
          {losers.slice(0, 10).map((m) => (
            <MoverRow key={m.ticker} mover={m} />
          ))}
        </div>
      </Card>
    </div>
  );
}
