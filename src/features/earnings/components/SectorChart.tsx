import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useSectorBreakdown } from "@/api/hooks/useEarnings";
import { Card } from "@/components/ui/Card";
import type { SectorData } from "@/api/types/earnings";

const PERIOD_OPTIONS = [
  { value: 90, label: "3 Months" },
  { value: 365, label: "1 Year" },
  { value: 730, label: "2 Years" },
];

export function SectorChart() {
  const [days, setDays] = useState(365);
  const { data, isLoading } = useSectorBreakdown(days);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Which Sectors Have the Most Action?
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Some industries (like tech) have bigger, more frequent price jumps
              than others. This chart shows which sectors see the most big moves
              and how often they bounce back.
            </p>
          </div>
          <div className="flex gap-1">
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
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : data ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.sectors}
                margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="sector"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<SectorTooltip />} />
                <Bar dataKey="total_events" radius={[0, 4, 4, 0]}>
                  {data.sectors.map((entry) => (
                    <Cell
                      key={entry.sector}
                      fill={
                        (entry.win_rate_1d ?? 50) >= 50
                          ? "rgba(16, 185, 129, 0.6)"
                          : "rgba(239, 68, 68, 0.4)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </Card>

      {/* Sector detail cards */}
      {data && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-text-secondary">
            Sector Details
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.sectors.map((sector) => (
              <SectorDetailCard key={sector.sector} sector={sector} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectorDetailCard({ sector: s }: { sector: SectorData }) {
  const winRate = s.win_rate_1d ?? 0;
  const good = winRate >= 50;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-text-primary">{s.sector}</h4>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            good
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {winRate}% bounce rate
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-text-muted">Events</p>
          <p className="text-sm font-bold text-text-primary">
            {s.total_events}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted">Avg Gap</p>
          <p className="text-sm font-bold text-text-primary">
            +{s.avg_gap ?? 0}%
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted">Avg 1d Return</p>
          <p
            className={`text-sm font-bold ${
              (s.avg_return_1d ?? 0) >= 0
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {(s.avg_return_1d ?? 0) >= 0 ? "+" : ""}
            {s.avg_return_1d ?? 0}%
          </p>
        </div>
      </div>
      {s.big_moves > 0 && (
        <p className="mt-2 text-[10px] text-text-muted">
          Includes {s.big_moves} big moves (5%+)
        </p>
      )}
    </Card>
  );
}

function SectorTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: SectorData;
  }>;
}) {
  if (!active || !payload?.[0]) return null;
  const s = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-bg-card p-3 shadow-lg">
      <p className="text-xs font-medium text-text-primary">{s.sector}</p>
      <p className="mt-1 text-sm font-bold text-text-primary">
        {s.total_events} events
      </p>
      <div className="mt-1 text-xs text-text-muted">
        <p>Avg gap: +{s.avg_gap}%</p>
        <p>Avg selloff: {s.avg_selloff}%</p>
        <p>
          Next-day win rate:{" "}
          <span
            className={
              (s.win_rate_1d ?? 0) >= 50
                ? "text-emerald-400"
                : "text-red-400"
            }
          >
            {s.win_rate_1d ?? "—"}%
          </span>
        </p>
      </div>
    </div>
  );
}
