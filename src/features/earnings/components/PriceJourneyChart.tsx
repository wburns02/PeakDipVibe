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
import type { PriceStage } from "@/api/types/earnings";

const VIEWS = [
  { id: "full", label: "Full Timeline" },
  { id: "day0", label: "Day 0 Detail" },
] as const;

type View = (typeof VIEWS)[number]["id"];

const SIZES = [
  { value: "all", label: "All Sizes" },
  { value: "Minor", label: "Minor" },
  { value: "Medium", label: "Medium" },
  { value: "Large", label: "Large" },
  { value: "Major", label: "Major" },
];

/** Derive a short tick label from the stage name */
function stageToTick(stage: string): string {
  if (stage.includes("-1")) return "Prev Close";
  if (stage.includes("Open")) return "Open";
  if (stage.includes("Peak")) return "Peak";
  if (stage.includes("Day 0 Close") || stage === "Day 0 Close") return "Close";
  const m = stage.match(/Day (\d+)/);
  if (m) return `Day ${m[1]}`;
  return stage;
}

/** Derive a tooltip time label from stage + hour */
function stageToTimeLabel(stage: string, hour: number): string {
  if (hour < 0) return "Day before news\n4:00 PM";
  if (stage.includes("Open")) return "Gap day\n9:30 AM";
  if (stage.includes("Peak")) return "Gap day\n~11:00 AM";
  if (stage.includes("Day 0 Close")) return "Gap day\n4:00 PM";
  const m = stage.match(/Day (\d+)/);
  if (m) return `Day ${m[1]} after\n4:00 PM`;
  return stage;
}

/** Day 0 Detail labels — approximate trading hours */
function day0Tick(stage: string): string {
  if (stage.includes("-1")) return "4:00 PM\nPrev Day";
  if (stage.includes("Open")) return "9:30 AM";
  if (stage.includes("Peak")) return "~11:00 AM";
  if (stage.includes("Day 0 Close")) return "4:00 PM";
  if (stage.includes("Day 1")) return "4:00 PM\nNext Day";
  return stage;
}

export function PriceJourneyChart() {
  const [view, setView] = useState<View>("full");
  const [moveSize, setMoveSize] = useState("all");
  const { data: journey, isLoading } = usePriceJourney(moveSize);

  // Filter stages based on view
  const filteredStages: PriceStage[] = journey
    ? view === "day0"
      ? journey.stages.filter((s) => {
          const h = s.hour ?? 0;
          // Show: prev close, day 0 open/peak/close, day 1
          return h <= 13;
        })
      : journey.stages
    : [];

  const chartData = filteredStages.map((s) => ({
    ...s,
    hour: s.hour ?? 0,
    tickLabel: view === "day0" ? day0Tick(s.stage) : stageToTick(s.stage),
    timeLabel: stageToTimeLabel(s.stage, s.hour ?? 0),
  }));

  return (
    <Card>
      {/* Controls row */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* View toggle */}
        <div className="flex rounded-lg border border-border bg-bg-secondary p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                view === v.id
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Move size filter */}
        <div className="flex flex-wrap gap-1">
          {SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => setMoveSize(s.value)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                moveSize === s.value
                  ? "bg-accent/20 text-accent"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-1 text-xs text-text-muted">
        {view === "day0"
          ? "Zoomed into the gap day — from previous close through next day close."
          : "Full timeline from previous close through Day 10."}
      </p>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : chartData.length > 0 ? (
        <>
          <p className="mb-2 text-xs text-text-muted">
            Based on {journey!.sample_size} events
            {moveSize !== "all" && ` (${moveSize} moves only)`}
          </p>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="journeyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="tickLabel"
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                  axisLine={false}
                  tickLine={false}
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <Tooltip content={<JourneyTooltip />} />
                <ReferenceLine
                  y={100}
                  stroke="rgba(255,255,255,0.15)"
                  strokeDasharray="3 3"
                  label={{
                    value: "$100 start",
                    position: "left",
                    fill: "rgba(255,255,255,0.3)",
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
            {filteredStages.map((stage, i) => {
              const change = stage.value - 100;
              return (
                <div
                  key={stage.stage}
                  className="flex items-start gap-3 rounded-lg bg-bg-hover/50 p-2.5"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-text-primary">
                      {stage.stage}{" "}
                      <span className="text-text-muted">— {stage.label}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {stage.explanation}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-bold ${
                      change >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(1)}%
                  </span>
                </div>
              );
            })}
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
  payload?: Array<{
    payload: {
      stage: string;
      value: number;
      label: string;
      explanation: string;
      timeLabel: string;
    };
  }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const change = d.value - 100;

  return (
    <div className="rounded-lg border border-border bg-bg-card p-3 shadow-lg">
      <p className="text-xs font-medium text-text-primary">{d.stage}</p>
      <p className="whitespace-pre-line text-[10px] text-text-muted">
        {d.timeLabel}
      </p>
      <p
        className={`mt-1 text-lg font-bold ${
          change >= 0 ? "text-emerald-400" : "text-red-400"
        }`}
      >
        ${d.value.toFixed(2)}
        <span className="ml-1 text-xs">
          ({change >= 0 ? "+" : ""}
          {change.toFixed(2)}%)
        </span>
      </p>
      <p className="mt-0.5 text-xs text-text-muted">{d.label}</p>
    </div>
  );
}
