import { useRef, useEffect, useCallback, useState } from "react";
import type { CorrelationMatrix } from "../lib/correlation";

interface Props {
  data: CorrelationMatrix;
}

/** Interpolate color for correlation value (-1 to +1). */
function corrColor(v: number): string {
  if (v >= 0.7) return `rgba(239,68,68,${0.3 + v * 0.7})`; // red — high positive
  if (v >= 0.3) return `rgba(251,191,36,${0.2 + v * 0.6})`; // amber — moderate
  if (v >= 0) return `rgba(148,163,184,${0.1 + v * 0.3})`; // slate — low
  if (v >= -0.3) return `rgba(96,165,250,${0.1 + Math.abs(v) * 0.4})`; // blue — slight negative
  return `rgba(59,130,246,${0.3 + Math.abs(v) * 0.7})`; // strong blue — negative
}

function corrTextColor(v: number, isDark: boolean): string {
  if (Math.abs(v) >= 0.6) return "#fff";
  return isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)";
}

export function CorrelationHeatmap({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; tickerA: string; tickerB: string; corr: number;
  } | null>(null);

  const { tickers, matrix } = data;
  const n = tickers.length;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const containerW = container.getBoundingClientRect().width;
    const labelW = 70; // space for ticker labels
    const cellSize = Math.min(Math.floor((containerW - labelW) / n), 72);
    const w = labelW + cellSize * n;
    const h = labelW + cellSize * n;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Read theme colors
    const styles = getComputedStyle(document.documentElement);
    const bgColor = styles.getPropertyValue("--color-bg-card").trim() || "#1a1b2e";
    const textColor = styles.getPropertyValue("--color-text-primary").trim() || "#fff";
    const isDark = document.documentElement.classList.contains("dark");

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    // Draw cells
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = labelW + j * cellSize;
        const y = labelW + i * cellSize;
        const v = matrix[i][j];

        // Cell background
        ctx.fillStyle = i === j ? "rgba(139,92,246,0.15)" : corrColor(v);
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

        // Round corners
        ctx.strokeStyle = "rgba(148,163,184,0.08)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

        // Value text
        ctx.fillStyle = i === j ? "rgba(139,92,246,0.6)" : corrTextColor(v, isDark);
        ctx.font = `600 ${cellSize > 50 ? 13 : 11}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          i === j ? "1.00" : v.toFixed(2),
          x + cellSize / 2,
          y + cellSize / 2,
        );
      }
    }

    // Row labels (left)
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = "600 11px system-ui, sans-serif";
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = textColor;
      ctx.fillText(tickers[i], labelW - 8, labelW + i * cellSize + cellSize / 2);
    }

    // Column labels (top)
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (let j = 0; j < n; j++) {
      ctx.save();
      const x = labelW + j * cellSize + cellSize / 2;
      const y = labelW - 8;
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = textColor;
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(tickers[j], 0, 0);
      ctx.restore();
    }
  }, [tickers, matrix, n]);

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  const handleMouse = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const labelW = 70;
      const cellSize = Math.min(Math.floor((rect.width - labelW) / n), 72);

      const col = Math.floor((mx - labelW) / cellSize);
      const row = Math.floor((my - labelW) / cellSize);

      if (row >= 0 && row < n && col >= 0 && col < n && row !== col) {
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          tickerA: tickers[row],
          tickerB: tickers[col],
          corr: matrix[row][col],
        });
        canvas.style.cursor = "pointer";
      } else {
        setTooltip(null);
        canvas.style.cursor = "default";
      }
    },
    [tickers, matrix, n],
  );

  return (
    <div ref={containerRef} className="relative overflow-x-auto rounded-2xl border border-border bg-bg-card p-4">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouse}
        onMouseLeave={() => setTooltip(null)}
        className="mx-auto"
      />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-bg-secondary px-3 py-2 shadow-xl"
          style={{
            left: Math.min(tooltip.x + 12, (containerRef.current?.offsetWidth ?? 400) - 180),
            top: Math.max(tooltip.y - 50, 0),
          }}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
            <span className="text-accent">{tooltip.tickerA}</span>
            <span className="text-text-muted">&times;</span>
            <span className="text-accent">{tooltip.tickerB}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[10px] text-text-muted">Correlation:</span>
            <span
              className={`text-sm font-bold font-mono ${
                tooltip.corr >= 0.7 ? "text-red" : tooltip.corr >= 0.3 ? "text-yellow-400" : tooltip.corr >= 0 ? "text-text-secondary" : "text-blue-400"
              }`}
            >
              {tooltip.corr > 0 ? "+" : ""}{tooltip.corr.toFixed(2)}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-text-muted">
            {tooltip.corr >= 0.7
              ? "Strongly correlated — similar risk"
              : tooltip.corr >= 0.3
                ? "Moderately correlated"
                : tooltip.corr >= 0
                  ? "Weakly correlated — good diversification"
                  : "Negatively correlated — natural hedge"}
          </p>
        </div>
      )}

      {/* Color legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-text-muted">
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-5 rounded-sm bg-blue-500/50" />
          <span>Negative</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-5 rounded-sm bg-slate-400/20" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-5 rounded-sm bg-amber-400/50" />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-5 rounded-sm bg-red-500/70" />
          <span>High</span>
        </div>
      </div>
    </div>
  );
}
