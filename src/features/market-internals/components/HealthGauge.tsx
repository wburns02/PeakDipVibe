import { useEffect, useRef } from "react";
import { scoreToColor, scoreToLabel } from "../lib/breadth-engine";
import type { MarketRegime } from "../lib/breadth-engine";

interface Props {
  score: number;
  regime: MarketRegime;
}

export function HealthGauge({ score, regime }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const currentRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 220;
    const h = 140;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h - 15;
    const r = 85;
    const lw = 14;
    const startAngle = Math.PI;
    const endAngle = 2 * Math.PI;

    function draw(current: number) {
      ctx!.clearRect(0, 0, w, h);

      // Background arc
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, startAngle, endAngle);
      ctx!.strokeStyle = getComputedStyle(canvas!).getPropertyValue("--color-bg-hover").trim() || "#1e293b";
      ctx!.lineWidth = lw;
      ctx!.lineCap = "round";
      ctx!.stroke();

      // Filled arc
      if (current > 0) {
        const fillEnd = startAngle + (current / 100) * Math.PI;
        ctx!.beginPath();
        ctx!.arc(cx, cy, r, startAngle, fillEnd);
        ctx!.strokeStyle = scoreToColor(current);
        ctx!.lineWidth = lw;
        ctx!.lineCap = "round";
        ctx!.stroke();
      }

      // Tick marks
      for (let pct = 0; pct <= 100; pct += 25) {
        const angle = startAngle + (pct / 100) * Math.PI;
        const innerR = r - lw / 2 - 4;
        const outerR = r - lw / 2 - 10;
        ctx!.beginPath();
        ctx!.moveTo(cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle));
        ctx!.lineTo(cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle));
        ctx!.strokeStyle = getComputedStyle(canvas!).getPropertyValue("--color-text-muted").trim() || "#64748b";
        ctx!.lineWidth = 1.5;
        ctx!.lineCap = "round";
        ctx!.stroke();
      }

      // Score text
      const rounded = Math.round(current);
      ctx!.font = "bold 32px system-ui, -apple-system, sans-serif";
      ctx!.fillStyle = scoreToColor(current);
      ctx!.textAlign = "center";
      ctx!.textBaseline = "bottom";
      ctx!.fillText(String(rounded), cx, cy - 12);

      // Label
      ctx!.font = "600 11px system-ui, -apple-system, sans-serif";
      ctx!.fillStyle = getComputedStyle(canvas!).getPropertyValue("--color-text-muted").trim() || "#94a3b8";
      ctx!.textBaseline = "top";
      ctx!.fillText(scoreToLabel(current), cx, cy - 6);
    }

    const target = score;
    const start = currentRef.current;
    const startTime = performance.now();
    const duration = 800;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      currentRef.current = current;
      draw(current);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} className="block" />
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
        style={{ backgroundColor: regime.color + "20", color: regime.color }}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: regime.color }}
        />
        {regime.label}
      </span>
    </div>
  );
}
