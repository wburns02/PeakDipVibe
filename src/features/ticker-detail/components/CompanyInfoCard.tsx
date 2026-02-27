import { Building2, Factory, Globe } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { TickerDetail } from "@/api/types/ticker";
import { formatLargeNumber, formatCurrency } from "@/lib/formatters";

interface CompanyInfoCardProps {
  ticker: TickerDetail;
}

export function CompanyInfoCard({ ticker }: CompanyInfoCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">
              {ticker.ticker}
            </h1>
            <Badge variant="accent">{ticker.exchange}</Badge>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {ticker.name ?? "Unknown Company"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-text-primary">
            {formatCurrency(ticker.latest_close)}
          </p>
          {ticker.latest_date && (
            <p className="text-xs text-text-muted">as of {ticker.latest_date}</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-text-secondary">
        {ticker.sector && (
          <span className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" />
            {ticker.sector}
          </span>
        )}
        {ticker.industry && (
          <span className="flex items-center gap-1">
            <Factory className="h-3.5 w-3.5" />
            {ticker.industry}
          </span>
        )}
        {ticker.market_cap && (
          <span className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" />
            {formatLargeNumber(ticker.market_cap)} market cap
          </span>
        )}
      </div>
    </Card>
  );
}
