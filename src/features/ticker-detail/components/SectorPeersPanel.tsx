import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useScreener } from "@/api/hooks/useScreener";
import { useSparkline } from "@/api/hooks/useCompare";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import type { TickerDetail } from "@/api/types/ticker";
import type { ScreenerResult } from "@/api/types/screener";

interface SectorPeersPanelProps {
  ticker: TickerDetail;
}

const PeerSparkline = memo(function PeerSparkline({
  ticker,
}: {
  ticker: string;
}) {
  const { data } = useSparkline(ticker, 7);
  if (!data || data.closes.length < 2) return <div className="h-[20px] w-10" />;
  const color =
    data.closes[data.closes.length - 1] >= data.closes[0]
      ? "#22c55e"
      : "#ef4444";
  return (
    <div className="w-10">
      <MiniSparkline
        data={data.closes.map((v) => ({ value: v }))}
        color={color}
        height={20}
      />
    </div>
  );
});

function rsiLabel(rsi: number | null): {
  text: string;
  className: string;
} {
  if (rsi == null) return { text: "-", className: "text-text-muted" };
  if (rsi < 30) return { text: rsi.toFixed(0), className: "text-green" };
  if (rsi > 70) return { text: rsi.toFixed(0), className: "text-red" };
  return { text: rsi.toFixed(0), className: "text-text-secondary" };
}

export const SectorPeersPanel = memo(function SectorPeersPanel({
  ticker,
}: SectorPeersPanelProps) {
  const sector = ticker.sector;

  const { data: screenerData, isLoading } = useScreener({
    sector: sector ?? undefined,
    limit: 12,
    sort_by: "change_pct",
    sort_dir: "desc",
  });

  const peers = useMemo(() => {
    if (!screenerData) return [];
    return screenerData
      .filter((p: ScreenerResult) => p.ticker !== ticker.ticker)
      .slice(0, 8);
  }, [screenerData, ticker.ticker]);

  if (!sector) return null;

  if (isLoading) return <Skeleton className="h-48" />;

  if (peers.length === 0) return null;

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">
          Sector Peers
        </h3>
        <span className="text-[10px] text-text-muted">({sector})</span>
      </div>

      <div className="space-y-0.5">
        {peers.map((p: ScreenerResult) => {
          const changePct = p.change_pct;
          const rsi = rsiLabel(p.rsi_14);
          const isPositive = changePct != null && changePct >= 0;

          return (
            <Link
              key={p.ticker}
              to={`/ticker/${p.ticker}`}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-hover"
            >
              <span className="w-[48px] shrink-0 text-xs font-medium text-accent">
                {p.ticker}
              </span>
              <PeerSparkline ticker={p.ticker} />
              <span className="min-w-0 flex-1 truncate text-[11px] text-text-muted">
                {p.name}
              </span>
              <span
                className={`w-[52px] shrink-0 text-right text-xs font-medium ${
                  isPositive ? "text-green" : "text-red"
                }`}
              >
                {changePct != null
                  ? `${isPositive ? "+" : ""}${changePct.toFixed(1)}%`
                  : "-"}
              </span>
              <span
                className={`w-[26px] shrink-0 text-right text-[11px] font-medium ${rsi.className}`}
              >
                {rsi.text}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[10px] text-text-muted">
        <span>Change % | RSI</span>
        <Link
          to={`/screener?sector=${encodeURIComponent(sector)}`}
          className="text-accent hover:underline"
        >
          View all in {sector}
        </Link>
      </div>
    </Card>
  );
});
