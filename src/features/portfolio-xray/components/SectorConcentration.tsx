import { useRef, useEffect, useCallback } from "react";
import type { SectorExposure } from "../lib/correlation";

interface Props {
  sectors: SectorExposure[];
}

const SECTOR_COLORS: string[] = [
  "#6366f1", "#06b6d4", "#f59e0b", "#ec4899", "#84cc16",
  "#8b5cf6", "#78716c", "#ef4444", "#14b8a6", "#f97316",
  "#a3e635", "#64748b",
];

export function SectorConcentration({ sectors }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawDonut = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 160;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const outerR = size * 0.45;
    const innerR = size * 0.28;

    let startAngle = -Math.PI / 2;

    for (let i = 0; i < sectors.length; i++) {
      const slice = (sectors[i].pct / 100) * Math.PI * 2;
      const endAngle = startAngle + slice;

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = SECTOR_COLORS[i % SECTOR_COLORS.length];
      ctx.fill();

      // Gap between slices
      ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-bg-card").trim() || "#1a1b2e";
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle = endAngle;
    }

    // Center text
    const textColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-text-primary").trim() || "#fff";
    ctx.fillStyle = textColor;
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(sectors.length), cx, cy - 6);
    const mutedColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-text-muted").trim() || "rgba(148,163,184,0.6)";
    ctx.fillStyle = mutedColor;
    ctx.font = "500 10px system-ui, sans-serif";
    ctx.fillText("sectors", cx, cy + 10);
  }, [sectors]);

  useEffect(() => {
    drawDonut();
  }, [drawDonut]);

  // Concentration risk metric
  const topSectorPct = sectors.length > 0 ? sectors[0].pct : 0;
  const hhi = sectors.reduce((sum, s) => sum + (s.pct / 100) ** 2, 0);
  const concentrationRisk = hhi > 0.4 ? "High" : hhi > 0.25 ? "Moderate" : "Low";
  const riskColor = hhi > 0.4 ? "#ef4444" : hhi > 0.25 ? "#eab308" : "#22c55e";

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Sector Exposure</h3>
          <p className="text-xs text-text-muted">Where your capital is concentrated</p>
        </div>
        <span
          className="rounded-md px-2 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: riskColor + "18", color: riskColor }}
        >
          {concentrationRisk} Concentration
        </span>
      </div>

      <div className="mt-4 flex items-start gap-5">
        <canvas ref={canvasRef} className="shrink-0" />

        <div className="flex-1 space-y-1.5 min-w-0">
          {sectors.map((s, i) => (
            <div key={s.sector} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="truncate text-xs font-medium text-text-secondary">
                    {s.sector}
                  </span>
                  <span className="ml-2 shrink-0 text-xs font-bold font-mono text-text-primary">
                    {s.pct.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-bg-hover">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${s.pct}%`,
                      backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length],
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          {topSectorPct > 50 && (
            <p className="mt-2 text-xs text-amber-400">
              {sectors[0].sector} dominates at {topSectorPct.toFixed(0)}% — consider diversifying
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
