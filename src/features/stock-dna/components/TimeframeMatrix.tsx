import type { TimeframeBias, Bias } from "../lib/confluence";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  shortTerm: TimeframeBias;
  mediumTerm: TimeframeBias;
  longTerm: TimeframeBias;
}

const biasConfig: Record<Bias, { icon: typeof TrendingUp; color: string; bg: string; label: string }> = {
  bullish: { icon: TrendingUp, color: "text-green", bg: "bg-green/10", label: "Bullish" },
  bearish: { icon: TrendingDown, color: "text-red", bg: "bg-red/10", label: "Bearish" },
  neutral: { icon: Minus, color: "text-text-muted", bg: "bg-bg-hover", label: "Neutral" },
};

function TimeframeCard({ tf }: { tf: TimeframeBias }) {
  const cfg = biasConfig[tf.bias];
  const Icon = cfg.icon;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg-secondary p-4 transition-all duration-200 hover:border-accent/20">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          {tf.label}
        </span>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${cfg.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>
      </div>
      {/* Score bar */}
      <div className="relative h-2 overflow-hidden rounded-full bg-bg-hover">
        <div
          className="absolute left-1/2 top-0 h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.abs(tf.score)}%`,
            marginLeft: tf.score >= 0 ? 0 : undefined,
            marginRight: tf.score < 0 ? 0 : undefined,
            transform: tf.score >= 0 ? "none" : `translateX(-100%)`,
            backgroundColor: tf.bias === "bullish" ? "#22c55e" : tf.bias === "bearish" ? "#ef4444" : "#64748b",
          }}
        />
        <div className="absolute left-1/2 top-0 h-full w-px bg-text-muted/30" />
      </div>
      {/* Drivers */}
      <div className="flex flex-wrap gap-1">
        {tf.drivers.map((d, i) => (
          <span key={i} className="rounded bg-bg-primary px-1.5 py-0.5 text-[10px] text-text-muted">
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TimeframeMatrix({ shortTerm, mediumTerm, longTerm }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <TimeframeCard tf={shortTerm} />
      <TimeframeCard tf={mediumTerm} />
      <TimeframeCard tf={longTerm} />
    </div>
  );
}
