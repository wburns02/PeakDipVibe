import { useRef, useEffect, useCallback } from "react";
import type { CorrelationMatrix } from "../lib/correlation";

interface Props {
  data: CorrelationMatrix;
}

const GRADE_COLORS: Record<string, string> = {
  A: "#22c55e",
  B: "#84cc16",
  C: "#eab308",
  D: "#f97316",
  F: "#ef4444",
};

const GRADE_LABELS: Record<string, string> = {
  A: "Excellently Diversified",
  B: "Well Diversified",
  C: "Moderately Diversified",
  D: "Poorly Diversified",
  F: "Highly Concentrated",
};

export function DiversificationScore({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { diversificationScore, grade, avgCorrelation } = data;
  const color = GRADE_COLORS[grade] ?? "#94a3b8";

  const drawGauge = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 180;
    canvas.width = size * dpr;
    canvas.height = (size * 0.65) * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size * 0.65}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size * 0.55;
    const r = size * 0.4;
    const startAngle = Math.PI;
    const endAngle = 2 * Math.PI;

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.lineWidth = 16;
    ctx.strokeStyle = "rgba(148,163,184,0.1)";
    ctx.lineCap = "round";
    ctx.stroke();

    // Score arc
    const scoreAngle = startAngle + (diversificationScore / 100) * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, scoreAngle);
    ctx.lineWidth = 16;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.stroke();

    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.max(startAngle, scoreAngle - 0.1), scoreAngle);
    ctx.lineWidth = 16;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Score text
    const textColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-text-primary").trim() || "#fff";
    ctx.fillStyle = textColor;
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(String(diversificationScore), cx, cy - 2);

    // "/100" label
    const mutedColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-text-muted").trim() || "rgba(148,163,184,0.5)";
    ctx.fillStyle = mutedColor;
    ctx.font = "500 11px system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("/100", cx, cy + 2);
  }, [diversificationScore, color]);

  useEffect(() => {
    drawGauge();
  }, [drawGauge]);

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5">
      <h3 className="text-sm font-semibold text-text-primary">Diversification Score</h3>
      <p className="text-xs text-text-muted">Based on average pairwise correlation</p>

      <div className="mt-3 flex flex-col items-center">
        <canvas ref={canvasRef} />

        <div className="mt-1 flex items-center gap-2">
          <span
            className="rounded-lg px-2.5 py-1 text-sm font-bold"
            style={{ backgroundColor: color + "20", color }}
          >
            {grade}
          </span>
          <span className="text-xs text-text-secondary" style={{ color }}>
            {GRADE_LABELS[grade]}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">Avg. Correlation</span>
          <span className="font-mono font-semibold text-text-primary">
            {avgCorrelation.toFixed(2)}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-bg-hover">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${avgCorrelation * 100}%`,
              backgroundColor: avgCorrelation > 0.6 ? "#ef4444" : avgCorrelation > 0.3 ? "#eab308" : "#22c55e",
            }}
          />
        </div>
        <p className="text-xs text-text-muted">
          {avgCorrelation >= 0.6
            ? "High concentration risk — your stocks tend to move together"
            : avgCorrelation >= 0.3
              ? "Moderate overlap — consider adding uncorrelated assets"
              : "Good spread — your stocks have independent drivers"}
        </p>
      </div>
    </div>
  );
}
