import { useRef, useEffect, useCallback } from "react";
import { useChartData } from "@/api/hooks/usePrices";
import { computeYearlyGrid } from "../lib/seasonality";
import type { YearlyGrid, MonthlyReturnCell } from "../lib/seasonality";
import { Skeleton } from "@/components/ui/Skeleton";

function getColor(value: number, isDark: boolean): string {
  const clamped = Math.max(-15, Math.min(15, value));
  const ratio = (clamped + 15) / 30; // 0 = deep red, 0.5 = neutral, 1 = deep green

  if (ratio < 0.5) {
    const t = ratio / 0.5;
    if (isDark) {
      // Dark mode: deep red → dark gray
      return `rgb(${Math.round(180 - t * 100)}, ${Math.round(t * 60)}, ${Math.round(t * 50)})`;
    }
    // Light mode: deep red → light gray
    return `rgb(${Math.round(220 - t * 90)}, ${Math.round(80 + t * 80)}, ${Math.round(80 + t * 80)})`;
  }
  const t = (ratio - 0.5) / 0.5;
  if (isDark) {
    // Dark mode: dark gray → deep green
    return `rgb(${Math.round(80 - t * 60)}, ${Math.round(60 + t * 120)}, ${Math.round(50 - t * 20)})`;
  }
  // Light mode: light gray → deep green
  return `rgb(${Math.round(160 - t * 120)}, ${Math.round(160 + t * 50)}, ${Math.round(160 - t * 120)})`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

function drawHeatmap(
  canvas: HTMLCanvasElement,
  grid: YearlyGrid,
  currentMonth: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const parent = canvas.parentElement;
  if (!parent || parent.clientWidth === 0) return;

  const isDark = document.documentElement.classList.contains("dark");
  const dpr = window.devicePixelRatio || 1;

  const labelW = 50;
  const headerH = 28;
  const cellW = Math.max(
    48,
    Math.floor((parent.clientWidth - labelW) / 12),
  );
  const cellH = 34;
  const totalW = labelW + cellW * 12;
  const totalH = headerH + cellH * grid.years.length;

  canvas.width = totalW * dpr;
  canvas.height = totalH * dpr;
  canvas.style.width = `${totalW}px`;
  canvas.style.height = `${totalH}px`;
  ctx.scale(dpr, dpr);

  const textColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
  const accentColor = isDark ? "#a78bfa" : "#7c3aed";

  // Header month labels
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let m = 0; m < 12; m++) {
    const x = labelW + m * cellW + cellW / 2;
    ctx.fillStyle = m + 1 === currentMonth ? accentColor : textColor;
    ctx.fillText(grid.months[m], x, headerH / 2);
  }

  // Build cell lookup
  const cellMap = new Map<string, MonthlyReturnCell>();
  for (const cell of grid.cells) {
    cellMap.set(`${cell.year}-${cell.month}`, cell);
  }

  // Rows
  for (let yi = 0; yi < grid.years.length; yi++) {
    const year = grid.years[yi];
    const y = headerH + yi * cellH;

    // Year label
    ctx.fillStyle = textColor;
    ctx.textAlign = "right";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(String(year), labelW - 8, y + cellH / 2);

    for (let m = 0; m < 12; m++) {
      const x = labelW + m * cellW;
      const cell = cellMap.get(`${year}-${m + 1}`);

      if (cell) {
        // Cell background
        ctx.fillStyle = getColor(cell.returnPct, isDark);
        const radius = 4;
        roundedRect(ctx, x + 1.5, y + 1.5, cellW - 3, cellH - 3, radius);
        ctx.fill();

        // Return text
        const val = cell.returnPct;
        const absVal = Math.abs(val);
        ctx.fillStyle =
          absVal > 4
            ? "rgba(255,255,255,0.95)"
            : isDark
              ? "rgba(255,255,255,0.8)"
              : "rgba(0,0,0,0.7)";
        ctx.textAlign = "center";
        ctx.font = "bold 10px system-ui, sans-serif";
        ctx.fillText(
          `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`,
          x + cellW / 2,
          y + cellH / 2,
        );
      } else {
        // Empty cell
        ctx.fillStyle = isDark
          ? "rgba(255,255,255,0.03)"
          : "rgba(0,0,0,0.03)";
        const radius = 4;
        roundedRect(ctx, x + 1.5, y + 1.5, cellW - 3, cellH - 3, radius);
        ctx.fill();
      }

      // Highlight current month column
      if (m + 1 === currentMonth && cell) {
        ctx.strokeStyle = isDark
          ? "rgba(167,139,250,0.7)"
          : "rgba(124,58,237,0.6)";
        ctx.lineWidth = 2.5;
        roundedRect(ctx, x + 1, y + 1, cellW - 2, cellH - 2, 4);
        ctx.stroke();
      }
    }
  }
}

export function YearlyHeatmap({ ticker }: { ticker: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: chartData, isLoading } = useChartData(ticker, { limit: 2500 });

  const currentMonth = new Date().getMonth() + 1;
  const grid = chartData ? computeYearlyGrid(chartData) : null;

  const paint = useCallback(() => {
    if (!canvasRef.current || !grid) return;
    drawHeatmap(canvasRef.current, grid, currentMonth);
  }, [grid, currentMonth]);

  useEffect(() => {
    paint();
    const obs = new MutationObserver(paint);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    window.addEventListener("resize", paint);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", paint);
    };
  }, [paint]);

  if (isLoading) return <Skeleton className="h-64" />;
  if (!grid || grid.years.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          Year-over-Year Monthly Returns
        </h3>
        <span className="text-[10px] text-text-muted">
          {grid.years[0]}&ndash;{grid.years[grid.years.length - 1]}
        </span>
      </div>
      <div className="overflow-x-auto">
        <canvas ref={canvasRef} className="block" />
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-text-muted">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-red" />
          <span>Negative</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-green" />
          <span>Positive</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm border border-accent" />
          <span>Current month</span>
        </div>
      </div>
    </div>
  );
}
