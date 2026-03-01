import { Card } from "@/components/ui/Card";
import type { ImpactCategory } from "@/api/types/earnings";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  categories: ImpactCategory[];
  isLoading: boolean;
}

const COLORS: Record<string, string> = {
  Minor: "border-blue-500/30",
  Medium: "border-amber-500/30",
  Large: "border-orange-500/30",
  Major: "border-red-500/30",
};

const BG_COLORS: Record<string, string> = {
  Minor: "bg-blue-500/5",
  Medium: "bg-amber-500/5",
  Large: "bg-orange-500/5",
  Major: "bg-red-500/5",
};

export function ImpactCards({ categories, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <div className="h-40 animate-pulse rounded-lg bg-bg-hover" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-text-primary">
        Move Size Breakdown
      </h2>
      <p className="mb-4 text-xs text-text-muted">
        We grouped every big stock move by how large the initial jump was.
        Here's what happened next for each group.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((cat) => {
          const win1d = cat.win_rate_1d ?? 0;
          const ret1d = cat.avg_return_1d ?? 0;

          return (
            <Card
              key={cat.move_size}
              className={`${COLORS[cat.move_size]} ${BG_COLORS[cat.move_size]}`}
            >
              {/* Header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cat.emoji}</span>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">
                      {cat.move_size} Moves
                    </h3>
                    <p className="text-xs text-text-muted">
                      {cat.total_events} events tracked
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-text-primary">
                    +{cat.avg_gap_pct}%
                  </p>
                  <p className="text-xs text-text-muted">avg jump</p>
                </div>
              </div>

              {/* Description */}
              <p className="mb-3 text-xs text-text-secondary">
                {cat.description}
              </p>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-bg-primary/50 p-2.5">
                <Stat
                  label="Next Day"
                  value={cat.avg_return_1d}
                  winRate={cat.win_rate_1d}
                />
                <Stat
                  label="1 Week"
                  value={cat.avg_return_5d}
                  winRate={cat.win_rate_5d}
                />
                <Stat
                  label="2 Weeks"
                  value={cat.avg_return_10d}
                  winRate={cat.win_rate_10d}
                />
              </div>

              {/* Verdict */}
              <div className="mt-3 flex items-center gap-1.5 text-xs">
                {ret1d > 0.5 ? (
                  <>
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">
                      Tends to keep going up
                    </span>
                  </>
                ) : ret1d < -0.5 ? (
                  <>
                    <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-red-400 font-medium">
                      Often gives back some gains
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="h-3.5 w-3.5 text-text-muted" />
                    <span className="text-text-muted font-medium">
                      Could go either way
                    </span>
                  </>
                )}
                <span className="text-text-muted">
                  — wins {win1d}% of the time next day
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  winRate,
}: {
  label: string;
  value: number | null;
  winRate: number | null;
}) {
  const v = value ?? 0;
  const positive = v >= 0;
  return (
    <div className="text-center">
      <p className="text-[10px] text-text-muted">{label}</p>
      <p
        className={`text-sm font-bold ${
          positive ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {positive ? "+" : ""}
        {value !== null ? `${value}%` : "—"}
      </p>
      {winRate !== null && (
        <p className="text-[10px] text-text-muted">{winRate}% win</p>
      )}
    </div>
  );
}
