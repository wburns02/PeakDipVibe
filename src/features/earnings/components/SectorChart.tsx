import { useState } from "react";
import { useSectorBreakdown } from "@/api/hooks/useEarnings";
import { Card } from "@/components/ui/Card";

const PERIOD_OPTIONS = [
  { value: 90, label: "3 Months" },
  { value: 365, label: "1 Year" },
  { value: 730, label: "2 Years" },
];

function getTrafficLight(winRate: number | null): {
  dot: string;
  label: string;
} {
  const wr = winRate ?? 50;
  if (wr >= 55) return { dot: "bg-emerald-400", label: "Good" };
  if (wr >= 48) return { dot: "bg-amber-400", label: "Okay" };
  return { dot: "bg-red-400", label: "Weak" };
}

export function SectorChart() {
  const [days, setDays] = useState(365);
  const { data, isLoading } = useSectorBreakdown(days);

  // Sort by total_events descending
  const sorted = data
    ? [...data.sectors].sort((a, b) => b.total_events - a.total_events)
    : [];

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-1.5">
        {PERIOD_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setDays(o.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              days === o.value
                ? "bg-accent text-white"
                : "bg-bg-hover text-text-secondary hover:text-text-primary"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Card>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-bg-hover"
              />
            ))}
          </div>
        </Card>
      ) : sorted.length > 0 ? (
        <Card>
          {/* Table header */}
          <div className="mb-2 grid grid-cols-[2rem_1fr_4.5rem_5.5rem_2.5rem] items-center gap-2 px-1 text-[10px] font-medium uppercase tracking-wider text-text-muted sm:grid-cols-[2rem_1fr_5rem_6rem_3rem]">
            <span>#</span>
            <span>Sector</span>
            <span className="text-right">Events</span>
            <span className="text-right">Bounce Rate</span>
            <span />
          </div>

          <div className="space-y-1">
            {sorted.map((sector, i) => {
              const traffic = getTrafficLight(sector.win_rate_1d);
              const wr = sector.win_rate_1d ?? 0;

              return (
                <div
                  key={sector.sector}
                  className="grid grid-cols-[2rem_1fr_4.5rem_5.5rem_2.5rem] items-center gap-2 rounded-lg px-1 py-2.5 transition-colors hover:bg-bg-hover/50 sm:grid-cols-[2rem_1fr_5rem_6rem_3rem]"
                >
                  {/* Rank */}
                  <span className="text-sm font-bold text-text-muted">
                    {i + 1}
                  </span>

                  {/* Sector name */}
                  <span className="truncate text-sm font-medium text-text-primary">
                    {sector.sector}
                  </span>

                  {/* Event count */}
                  <span className="text-right text-sm text-text-secondary">
                    {sector.total_events}
                  </span>

                  {/* Bounce rate */}
                  <span
                    className={`text-right text-sm font-semibold ${
                      wr >= 55
                        ? "text-emerald-400"
                        : wr >= 48
                          ? "text-amber-400"
                          : "text-red-400"
                    }`}
                  >
                    {wr}%
                  </span>

                  {/* Traffic light dot */}
                  <div className="flex justify-center">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${traffic.dot}`}
                      title={`${traffic.label} bounce rate`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-center text-sm text-text-muted">
            No sector data available for this period.
          </p>
        </Card>
      )}
    </div>
  );
}
