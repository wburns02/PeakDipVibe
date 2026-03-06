import { useEffect, useState } from "react";
import type { MarketMood } from "../lib/scoring";
import { Skeleton } from "@/components/ui/Skeleton";

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

export function MarketMoodGauge({ mood, loading }: Props) {
  const [animated, setAnimated] = useState(0);

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
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${
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
    </div>
  );
}
