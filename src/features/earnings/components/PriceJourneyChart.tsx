import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { usePriceJourney } from "@/api/hooks/useEarnings";
import { Card } from "@/components/ui/Card";

const SIZES = [
  { value: "all", label: "All Sizes" },
  { value: "Minor", label: "Minor (1.5-3%)" },
  { value: "Medium", label: "Medium (3-5%)" },
  { value: "Large", label: "Large (5-10%)" },
  { value: "Major", label: "Major (10%+)" },
];

export function PriceJourneyChart() {
  const [moveSize, setMoveSize] = useState("all");
  const { data: journey, isLoading } = usePriceJourney(moveSize);

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-primary">
          The Price Journey
        </h2>
        <p className="mt-0.5 text-xs text-text-muted">
          Follow the average stock from before the news to one week later. Each
          dot shows what happens at each stage. Start at 100 = the closing price
          before the news dropped.
        </p>
      </div>

      {/* Size selector */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {SIZES.map((s) => (
          <button
            key={s.value}
            onClick={() => setMoveSize(s.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              moveSize === s.value
                ? "bg-accent text-white"
                : "bg-bg-hover text-text-secondary hover:text-text-primary"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : journey ? (
        <>
          <p className="mb-2 text-xs text-text-muted">
            Based on {journey.sample_size} events
          </p>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={journey.stages}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="journeyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                  axisLine={false}
                  tickLine={false}
                  domain={["dataMin - 2", "dataMax + 2"]}
                  tickFormatter={(v: number) => `${v}`}
                />
                <Tooltip content={<JourneyTooltip />} />
                <ReferenceLine
                  y={100}
                  stroke="rgba(255,255,255,0.2)"
                  strokeDasharray="3 3"
                  label={{
                    value: "Starting Price",
                    position: "left",
                    fill: "rgba(255,255,255,0.4)",
                    fontSize: 10,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#14b8a6"
                  strokeWidth={2.5}
                  fill="url(#journeyGrad)"
                  dot={{
                    r: 5,
                    fill: "#14b8a6",
                    stroke: "#0d1117",
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 7 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stage explanations */}
          <div className="mt-4 space-y-2">
            {journey.stages.map((stage, i) => (
              <div
                key={stage.stage}
                className="flex items-start gap-3 rounded-lg bg-bg-hover/50 p-2.5"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                  {i + 1}
                </div>
                <div>
                  <p className="text-xs font-medium text-text-primary">
                    {stage.stage}{" "}
                    <span className="text-text-muted">— {stage.label}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {stage.explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Card>
  );
}

function JourneyTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { stage: string; value: number; label: string; explanation: string } }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const change = d.value - 100;

  return (
    <div className="rounded-lg border border-border bg-bg-card p-3 shadow-lg">
      <p className="text-xs font-medium text-text-primary">{d.stage}</p>
      <p
        className={`mt-1 text-lg font-bold ${
          change >= 0 ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {change >= 0 ? "+" : ""}
        {change.toFixed(2)}%
      </p>
      <p className="mt-0.5 text-xs text-text-muted">{d.label}</p>
    </div>
  );
}
