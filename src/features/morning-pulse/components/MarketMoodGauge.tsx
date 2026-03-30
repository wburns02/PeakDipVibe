import { useEffect, useState, useMemo } from "react";
import type { MarketMood } from "../lib/scoring";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMoodHistory, type MoodEntry } from "@/hooks/useMoodHistory";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const RADIUS = 80;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_LENGTH = CIRCUMFERENCE * 0.75; // 270 degrees
const GAP_LENGTH = CIRCUMFERENCE * 0.25;
const VIEW_SIZE = (RADIUS + STROKE) * 2;
const CENTER = VIEW_SIZE / 2;

interface Props {
  mood: MarketMood;
  loading?: boolean;
}

function MoodTrendChart({ history, currentScore }: { history: MoodEntry[]; currentScore: number }) {
  // Always show — even with 0 history, show today's score as a single point
  const entries = history.length > 0 ? history : [{ date: new Date().toISOString().slice(0, 10), score: currentScore }];

  if (entries.length === 1) {
    return (
      <div className="mt-5 w-full max-w-sm">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-text-muted">Weekly Trend</h4>
          <span className="text-xs text-text-muted">Tracking started today</span>
        </div>
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-4">
          <div className="text-center">
            <span className="text-2xl font-bold text-accent">{entries[0].score}</span>
            <p className="mt-1 text-xs text-text-muted">Today's score — trend builds daily</p>
          </div>
        </div>
      </div>
    );
  }

  const W = 320;
  const H = 80;
  const PAD_X = 28;
  const PAD_Y = 12;
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y * 2;

  const min = Math.min(...entries.map((e) => e.score)) - 5;
  const max = Math.max(...entries.map((e) => e.score)) + 5;
  const range = Math.max(max - min, 10);

  const points = entries.map((e, i) => ({
    x: PAD_X + (i / (entries.length - 1)) * chartW,
    y: PAD_Y + chartH - ((e.score - min) / range) * chartH,
    ...e,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const first = entries[0].score;
  const last = entries[entries.length - 1].score;
  const delta = last - first;
  const lineColor = delta > 2 ? "#22c55e" : delta < -2 ? "#ef4444" : "#f59e0b";

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short" });
  };

  return (
    <div className="mt-5 w-full max-w-sm">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold text-text-muted">Weekly Trend</h4>
        <div className="flex items-center gap-1 text-xs" style={{ color: lineColor }}>
          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          <span className="font-semibold">{delta > 0 ? "+" : ""}{delta}</span>
          <span className="text-text-muted">pts</span>
        </div>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Grid lines */}
        {[0, 0.5, 1].map((frac) => {
          const y = PAD_Y + frac * chartH;
          const val = Math.round(max - frac * range);
          return (
            <g key={frac}>
              <line x1={PAD_X} x2={W - PAD_X} y1={y} y2={y} stroke="currentColor" className="text-border" strokeWidth={0.5} strokeDasharray="4 4" />
              <text x={PAD_X - 4} y={y + 3} textAnchor="end" className="fill-text-muted" fontSize={9}>{val}</text>
            </g>
          );
        })}

        {/* Line */}
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots + day labels */}
        {points.map((p, i) => (
          <g key={p.date}>
            <circle cx={p.x} cy={p.y} r={3} fill={lineColor} />
            <text x={p.x} y={H - 1} textAnchor="middle" className="fill-text-muted" fontSize={8}>
              {i === 0 || i === points.length - 1 || entries.length <= 7 ? formatDay(p.date) : ""}
            </text>
            <title>{p.date}: {p.score}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function MarketMoodGauge({ mood, loading }: Props) {
  const [animated, setAnimated] = useState(0);
  const scoreToRecord = loading ? null : mood.score;
  const { getHistory } = useMoodHistory(scoreToRecord);

  const history = useMemo(() => getHistory(7), [getHistory, mood.score]);

  useEffect(() => {
    if (loading) return;
    const target = mood.score;
    let frame: number;
    const start = performance.now();
    const duration = 1200;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimated(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mood.score, loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-48 w-48 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  const offset = ARC_LENGTH * (1 - animated / 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg
          width={VIEW_SIZE}
          height={VIEW_SIZE}
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          className="drop-shadow-lg"
        >
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="65%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>

          {/* Background arc */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            className="text-bg-hover"
            strokeWidth={STROKE}
            strokeDasharray={`${ARC_LENGTH} ${GAP_LENGTH}`}
            strokeLinecap="round"
            transform={`rotate(135, ${CENTER}, ${CENTER})`}
          />

          {/* Foreground arc */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth={STROKE}
            strokeDasharray={`${ARC_LENGTH} ${GAP_LENGTH}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(135, ${CENTER}, ${CENTER})`}
            style={{ transition: "stroke-dashoffset 0.1s linear" }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-text-primary">
            {animated}
          </span>
          <span className="text-xs text-text-muted">/100</span>
          <span
            className="mt-1 rounded-full px-3 py-0.5 text-xs font-semibold"
            style={{ color: mood.color, backgroundColor: `${mood.color}15` }}
          >
            {mood.label}
          </span>
        </div>
      </div>

      {/* Summary */}
      {mood.summary && (
        <p className="mt-3 max-w-md text-center text-sm leading-relaxed text-text-secondary">
          {mood.summary}
        </p>
      )}

      {/* Contributing factors */}
      {mood.factors.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {mood.factors.map((f) => (
            <div
              key={f.label}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2.5 text-sm ${
                f.positive
                  ? "border-green/20 bg-green/5 text-green"
                  : "border-red/20 bg-red/5 text-red"
              }`}
            >
              <span className="text-text-muted">{f.label}</span>
              <span className="font-semibold">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Weekly trend chart */}
      <MoodTrendChart history={history} currentScore={mood.score} />
    </div>
  );
}
