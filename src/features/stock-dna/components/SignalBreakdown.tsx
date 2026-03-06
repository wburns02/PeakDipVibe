import type { SignalDetail, Bias } from "../lib/confluence";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  signals: SignalDetail[];
}

const biasIcon: Record<Bias, { icon: typeof TrendingUp; color: string }> = {
  bullish: { icon: TrendingUp, color: "text-green" },
  bearish: { icon: TrendingDown, color: "text-red" },
  neutral: { icon: Minus, color: "text-text-muted" },
};

export function SignalBreakdown({ signals }: Props) {
  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Signal Breakdown</h3>
        <p className="text-xs text-text-muted mt-0.5">All indicators contributing to the score</p>
      </div>
      <div className="divide-y divide-border/50">
        {signals.map((s) => {
          const cfg = biasIcon[s.bias];
          const Icon = cfg.icon;
          return (
            <div
              key={s.name}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg-hover"
            >
              <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
              <span className="flex-1 text-sm text-text-secondary">{s.name}</span>
              <span className="font-mono text-sm text-text-primary">{s.value}</span>
              {/* Weight bar */}
              <div className="hidden sm:flex w-16 items-center gap-1">
                <div className="h-1.5 flex-1 rounded-full bg-bg-hover overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(s.weight / 30) * 100}%`,
                      backgroundColor: s.bias === "bullish" ? "#22c55e" : s.bias === "bearish" ? "#ef4444" : "#64748b",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
