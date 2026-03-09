import { useRef, useEffect, useCallback, useState } from "react";
import type { SectorMetrics } from "../lib/rotation";
import { getQuadrantMeta } from "../lib/rotation";

interface Props {
  sectors: SectorMetrics[];
  onSelect: (sector: string | null) => void;
  selected: string | null;
}

const SECTOR_COLORS: Record<string, string> = {
  "Technology": "#6366f1",
  "Information Technology": "#6366f1",
  "Health Care": "#06b6d4",
  "Financials": "#f59e0b",
  "Consumer Discretionary": "#ec4899",
  "Consumer Staples": "#84cc16",
  "Communication Services": "#8b5cf6",
  "Industrials": "#78716c",
  "Energy": "#ef4444",
  "Utilities": "#14b8a6",
  "Real Estate": "#f97316",
  "Materials": "#a3e635",
};

function getColor(sector: string): string {
  return SECTOR_COLORS[sector] ?? "#94a3b8";
}

export function RotationChart({ sectors, onSelect, selected }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; sector: SectorMetrics } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = Math.min(rect.width * 0.7, 500);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const pad = { top: 30, right: 30, bottom: 40, left: 50 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;
    const cx = pad.left + pw / 2;
    const cy = pad.top + ph / 2;

    // Background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--color-bg-card").trim() || "#1a1b2e";
    ctx.fillRect(0, 0, w, h);

    // Quadrant backgrounds
    const quadrants = [
      { x: cx, y: pad.top, w: pw / 2, h: ph / 2, color: "rgba(34,197,94,0.04)", label: "LEADING" },
      { x: pad.left, y: pad.top, w: pw / 2, h: ph / 2, color: "rgba(59,130,246,0.04)", label: "IMPROVING" },
      { x: pad.left, y: cy, w: pw / 2, h: ph / 2, color: "rgba(239,68,68,0.04)", label: "LAGGING" },
      { x: cx, y: cy, w: pw / 2, h: ph / 2, color: "rgba(234,179,8,0.04)", label: "WEAKENING" },
    ];

    for (const q of quadrants) {
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x, q.y, q.w, q.h);
    }

    // Quadrant labels
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#22c55e"; ctx.fillText("LEADING", cx + 8, pad.top + 18);
    ctx.fillStyle = "#3b82f6"; ctx.fillText("IMPROVING", pad.left + 8, pad.top + 18);
    ctx.fillStyle = "#ef4444"; ctx.fillText("LAGGING", pad.left + 8, cy + 18);
    ctx.fillStyle = "#eab308"; ctx.fillText("WEAKENING", cx + 8, cy + 18);
    ctx.globalAlpha = 1;

    // Grid lines
    ctx.strokeStyle = "rgba(148,163,184,0.1)";
    ctx.lineWidth = 1;
    // Horizontal center
    ctx.beginPath(); ctx.moveTo(pad.left, cy); ctx.lineTo(w - pad.right, cy); ctx.stroke();
    // Vertical center
    ctx.beginPath(); ctx.moveTo(cx, pad.top); ctx.lineTo(cx, h - pad.bottom); ctx.stroke();

    // Axis labels
    ctx.fillStyle = "rgba(148,163,184,0.5)";
    ctx.font = "500 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Relative Strength", cx, h - 8);
    ctx.save();
    ctx.translate(14, cy);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Momentum", 0, 0);
    ctx.restore();

    // Axis ticks
    ctx.font = "400 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(148,163,184,0.35)";
    for (const v of [-60, -30, 0, 30, 60]) {
      const x = cx + (v / 100) * (pw / 2);
      ctx.fillText(String(v), x, h - pad.bottom + 14);
    }
    ctx.textAlign = "right";
    for (const v of [-60, -30, 0, 30, 60]) {
      const y = cy - (v / 100) * (ph / 2);
      ctx.fillText(String(v), pad.left - 6, y + 3);
    }

    // Plot sectors
    const scale = (val: number, range: number) => (val / 100) * (range / 2);

    for (const s of sectors) {
      const x = cx + scale(s.relativeStrength, pw);
      const y = cy - scale(s.momentum, ph);
      const isHovered = hoveredSector === s.sector;
      const isSelected = selected === s.sector;
      const baseR = Math.max(6, Math.min(14, s.stockCount * 0.6));
      const r = isHovered || isSelected ? baseR + 3 : baseR;

      // Glow for selected/hovered
      if (isHovered || isSelected) {
        ctx.shadowColor = getColor(s.sector);
        ctx.shadowBlur = 15;
      }

      // Dot
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = getColor(s.sector);
      ctx.globalAlpha = isHovered || isSelected ? 1 : 0.8;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Border
      ctx.strokeStyle = isSelected ? "#fff" : "rgba(255,255,255,0.2)";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Label
      const shortName = s.sector.replace("Information ", "").replace("Consumer ", "").replace("Communication ", "Comm. ");
      ctx.fillStyle = isHovered || isSelected ? "#fff" : "rgba(255,255,255,0.7)";
      ctx.font = isHovered || isSelected ? "600 11px system-ui" : "500 10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(shortName, x, y - r - 5);
    }
  }, [sectors, hoveredSector, selected]);

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  const handleMouse = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const w = rect.width;
      const h = rect.height;
      const pad = { top: 30, right: 30, bottom: 40, left: 50 };
      const pw = w - pad.left - pad.right;
      const ph = h - pad.top - pad.bottom;
      const cx = pad.left + pw / 2;
      const cy = pad.top + ph / 2;

      let found: SectorMetrics | null = null;
      for (const s of sectors) {
        const x = cx + (s.relativeStrength / 100) * (pw / 2);
        const y = cy - (s.momentum / 100) * (ph / 2);
        const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
        if (dist < 20) { found = s; break; }
      }

      setHoveredSector(found?.sector ?? null);
      canvas.style.cursor = found ? "pointer" : "default";

      if (found) {
        setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, sector: found });
      } else {
        setTooltip(null);
      }
    },
    [sectors],
  );

  const handleClick = useCallback(() => {
    onSelect(hoveredSector === selected ? null : hoveredSector);
  }, [hoveredSector, selected, onSelect]);

  return (
    <div ref={containerRef} className="relative rounded-2xl border border-border bg-bg-card overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouse}
        onMouseLeave={() => { setHoveredSector(null); setTooltip(null); }}
        onClick={handleClick}
        className="w-full"
      />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-bg-secondary px-3 py-2 shadow-xl"
          style={{
            left: Math.min(tooltip.x + 12, (containerRef.current?.offsetWidth ?? 400) - 200),
            top: tooltip.y - 60,
          }}
        >
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getColor(tooltip.sector.sector) }} />
            <span className="text-xs font-bold text-text-primary">{tooltip.sector.sector}</span>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <span className="text-text-muted">RS:</span>
            <span className={tooltip.sector.relativeStrength >= 0 ? "text-green font-mono" : "text-red font-mono"}>
              {tooltip.sector.relativeStrength > 0 ? "+" : ""}{tooltip.sector.relativeStrength}
            </span>
            <span className="text-text-muted">Momentum:</span>
            <span className={tooltip.sector.momentum >= 0 ? "text-green font-mono" : "text-red font-mono"}>
              {tooltip.sector.momentum > 0 ? "+" : ""}{tooltip.sector.momentum}
            </span>
            <span className="text-text-muted">Avg RSI:</span>
            <span className="text-text-secondary font-mono">{tooltip.sector.avgRsi.toFixed(1)}</span>
            <span className="text-text-muted">Stocks:</span>
            <span className="text-text-secondary font-mono">{tooltip.sector.stockCount}</span>
          </div>
          <div className="mt-1 flex items-center gap-1">
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: getQuadrantMeta(tooltip.sector.quadrant).color }}
            />
            <span className="text-xs font-medium" style={{ color: getQuadrantMeta(tooltip.sector.quadrant).color }}>
              {getQuadrantMeta(tooltip.sector.quadrant).label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
