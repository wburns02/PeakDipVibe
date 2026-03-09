import { TrendingUp, Target, Zap, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { GlossaryTerm } from "@/components/education/GlossaryTerm";
import type { SignalStats } from "@/api/types/signals";

interface SignalStatsCardsProps {
  stats?: SignalStats;
  isLoading: boolean;
}

const cards = [
  {
    key: "total",
    label: "Total Signals",
    icon: Zap,
    getValue: (s: SignalStats) => s.total.toString(),
    color: "text-accent",
  },
  {
    key: "win_rate",
    label: "Win Rate (1d)",
    glossary: "win_rate",
    icon: Target,
    getValue: (s: SignalStats) =>
      s.win_rate_1d > 0 ? `${s.win_rate_1d.toFixed(1)}%` : "—",
    color: "text-green",
  },
  {
    key: "avg_return",
    label: "Avg Return (1d)",
    icon: TrendingUp,
    getValue: (s: SignalStats) =>
      s.avg_return_1d !== 0
        ? `${s.avg_return_1d >= 0 ? "+" : ""}${s.avg_return_1d.toFixed(2)}%`
        : "—",
    color: "text-green",
  },
  {
    key: "avg_strength",
    label: "Avg Strength",
    glossary: "signal_strength",
    icon: BarChart3,
    getValue: (s: SignalStats) =>
      s.avg_strength > 0 ? s.avg_strength.toFixed(0) : "—",
    color: "text-amber",
  },
] as const;

export function SignalStatsCards({ stats, isLoading }: SignalStatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ key, label, icon: Icon, getValue, color, ...rest }) => (
        <Card key={key}>
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center text-sm text-text-muted">
                {label}
                {"glossary" in rest && rest.glossary && <GlossaryTerm term={rest.glossary as string} />}
              </p>
              <p className={`mt-1 text-2xl font-bold ${color}`}>
                {isLoading || !stats ? "—" : getValue(stats)}
              </p>
            </div>
            <div className="rounded-lg bg-bg-hover p-2">
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
