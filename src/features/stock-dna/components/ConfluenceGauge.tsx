import { useEffect, useRef } from "react";
import type { Verdict } from "../lib/confluence";

interface Props {
  score: number;
  verdict: Verdict;
  verdictColor: string;
}

export function ConfluenceGauge({ score, verdict, verdictColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatedScore = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 220;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2 + 10;
    const radius = 85;
    const lineWidth = 12;
    const startAngle = Math.PI * 0.8;
    const endAngle = Math.PI * 2.2;
    const totalArc = endAngle - startAngle;

    function draw(currentScore: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);

      // Background arc
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.stroke();

      // Gradient arc
      const pct = currentScore / 100;
      const currentEnd = startAngle + totalArc * pct;

      const gradient = ctx.createLinearGradient(
        cx - radius, cy, cx + radius, cy
      );
      gradient.addColorStop(0, "#ef4444");
      gradient.addColorStop(0.35, "#f59e0b");
      gradient.addColorStop(0.5, "#94a3b8");
      gradient.addColorStop(0.65, "#4ade80");
      gradient.addColorStop(1, "#22c55e");

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, currentEnd);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.stroke();

      // Needle dot
      const dotAngle = startAngle + totalArc * pct;
      const dotX = cx + Math.cos(dotAngle) * radius;
      const dotY = cy + Math.sin(dotAngle) * radius;

      ctx.beginPath();
      ctx.arc(dotX, dotY, 7, 0, Math.PI * 2);
      ctx.fillStyle = verdictColor;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Score text
      ctx.fillStyle = verdictColor;
      ctx.font = "bold 42px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(Math.round(currentScore).toString(), cx, cy - 8);

      // Label
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.fillText("CONFLUENCE", cx, cy + 20);

      // Scale labels
      ctx.font = "10px Inter, system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.textAlign = "left";
      const lx = cx + Math.cos(startAngle) * (radius + 18);
      const ly = cy + Math.sin(startAngle) * (radius + 18);
      ctx.fillText("0", lx, ly);
      ctx.textAlign = "right";
      const rx = cx + Math.cos(endAngle) * (radius + 18);
      const ry = cy + Math.sin(endAngle) * (radius + 18);
      ctx.fillText("100", rx, ry);
    }

    // Animate
    const startVal = animatedScore.current;
    const startTime = performance.now();
    const duration = 800;

    function animate(time: number) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (score - startVal) * eased;
      animatedScore.current = current;
      draw(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score, verdictColor]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} className="block" />
      <span
        className="rounded-full px-4 py-1.5 text-sm font-bold tracking-wide"
        style={{ backgroundColor: `${verdictColor}20`, color: verdictColor }}
      >
        {verdict}
      </span>
    </div>
  );
}
