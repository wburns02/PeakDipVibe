import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import type { SectorPerformance } from "@/api/types/market";
import { getSectorColor } from "@/lib/colors";

interface SectorBreakdownCardProps {
  sectors: SectorPerformance[];
}

export const SectorBreakdownCard = memo(function SectorBreakdownCard({
  sectors,
}: SectorBreakdownCardProps) {
  const navigate = useNavigate();

  if (sectors.length === 0) return null;

  const sorted = [...sectors].sort(
    (a, b) => b.avg_change_pct - a.avg_change_pct,
  );

  const maxAbs = Math.max(
    ...sorted.map((s) => Math.abs(s.avg_change_pct)),
    0.01,
  );

  return (
    <Card title="Sector Rankings" subtitle="Today's performance by sector">
      <div className="space-y-1.5">
        {sorted.map((s) => {
          const pct = s.avg_change_pct;
          const barWidth = Math.min((Math.abs(pct) / maxAbs) * 100, 100);
          const isPositive = pct >= 0;
          const color = getSectorColor(s.sector);

          return (
            <button
              key={s.sector}
              type="button"
              onClick={() =>
                navigate(
                  `/screener?sector=${encodeURIComponent(s.sector)}`,
                )
              }
              className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-bg-hover"
            >
              {/* Sector name */}
              <span className="w-[140px] shrink-0 truncate text-xs text-text-secondary group-hover:text-text-primary">
                {s.sector}
              </span>

              {/* Bar area — diverging from center */}
              <div className="relative flex h-4 flex-1 items-center">
                {/* Center line */}
                <div className="absolute left-1/2 top-0 h-full w-px bg-border" />

                {/* Bar */}
                {isPositive ? (
                  <div
                    className="absolute left-1/2 h-3 rounded-r-sm transition-all"
                    style={{
                      width: `${barWidth / 2}%`,
                      backgroundColor: color,
                      opacity: 0.8,
                    }}
                  />
                ) : (
                  <div
                    className="absolute right-1/2 h-3 rounded-l-sm transition-all"
                    style={{
                      width: `${barWidth / 2}%`,
                      backgroundColor: color,
                      opacity: 0.8,
                    }}
                  />
                )}
              </div>

              {/* Percentage */}
              <span
                className={`w-[52px] shrink-0 text-right text-xs font-medium ${
                  isPositive ? "text-green" : "text-red"
                }`}
              >
                {isPositive ? "+" : ""}
                {pct.toFixed(2)}%
              </span>

              {/* Ticker count */}
              <span className="w-[28px] shrink-0 text-right text-[10px] text-text-muted">
                {s.ticker_count}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
});
