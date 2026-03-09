import { Card } from "@/components/ui/Card";
import type { ImpactCategory } from "@/api/types/earnings";

interface Props {
  categories: ImpactCategory[];
  isLoading: boolean;
}

function getVerdict(winRate: number | null): {
  label: string;
  color: string;
  bg: string;
  dot: string;
} {
  const wr = winRate ?? 50;
  if (wr >= 55)
    return {
      label: "USUALLY BOUNCES",
      color: "text-emerald-400",
      bg: "border-emerald-500/30 bg-emerald-500/5",
      dot: "bg-emerald-400",
    };
  if (wr >= 48)
    return {
      label: "COIN FLIP",
      color: "text-amber-400",
      bg: "border-amber-500/30 bg-amber-500/5",
      dot: "bg-amber-400",
    };
  return {
    label: "OFTEN FADES",
    color: "text-red-400",
    bg: "border-red-500/30 bg-red-500/5",
    dot: "bg-red-400",
  };
}

export function ImpactCards({ categories, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <div className="h-36 animate-pulse rounded-lg bg-bg-hover" />
          </Card>
        ))}
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <Card>
        <p className="py-6 text-center text-sm text-text-muted">
          Impact categories are calculated from historical earnings events. Not enough data has been collected yet — check back after more earnings seasons.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((cat) => {
        const verdict = getVerdict(cat.win_rate_1d);

        return (
          <Card key={cat.move_size} className={verdict.bg}>
            {/* Traffic light verdict */}
            <div className="mb-3 flex items-center gap-2">
              <span role="img" aria-label={verdict.label} className={`h-3 w-3 rounded-full ${verdict.dot}`} />
              <span className={`text-xs font-bold tracking-wide ${verdict.color}`}>
                {verdict.label}
              </span>
            </div>

            {/* Category name + count */}
            <p className="text-sm font-semibold text-text-primary">
              {cat.emoji} {cat.move_size} Moves
              <span className="ml-1 text-xs font-normal text-text-muted">
                ({cat.avg_gap_pct}%+)
              </span>
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {cat.total_events} events tracked
            </p>

            {/* One key stat */}
            <div className="mt-3 rounded-lg bg-bg-primary/50 p-2.5 text-center">
              <p className="text-2xl font-bold text-text-primary">
                {cat.win_rate_1d != null ? `${cat.win_rate_1d}%` : "—"}
              </p>
              <p className="text-xs text-text-muted">
                go up the next day
              </p>
            </div>

            {/* One-line description */}
            <p className="mt-3 text-xs leading-relaxed text-text-secondary">
              {cat.description}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
