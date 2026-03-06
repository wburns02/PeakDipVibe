import { useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SectorPerformance } from "@/api/types/market";
import { formatPercent } from "@/lib/formatters";

interface Props {
  sectors: SectorPerformance[] | undefined;
  loading?: boolean;
}

export function SectorFlow({ sectors, loading }: Props) {
  const { inflows, outflows, maxAbs } = useMemo(() => {
    if (!sectors?.length) return { inflows: [], outflows: [], maxAbs: 1 };
    const sorted = [...sectors].sort(
      (a, b) => b.avg_change_pct - a.avg_change_pct,
    );
    const inf = sorted.filter((s) => s.avg_change_pct > 0);
    const out = sorted.filter((s) => s.avg_change_pct < 0).reverse();
    const max = Math.max(
      ...sorted.map((s) => Math.abs(s.avg_change_pct)),
      0.1,
    );
    return { inflows: inf, outflows: out, maxAbs: max };
  }, [sectors]);

  if (loading) {
    return (
      <div>
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!sectors?.length) return null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Layers className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-bold text-text-primary">Sector Rotation</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Inflows */}
        <div className="rounded-xl border border-green/20 bg-green/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-green" />
            <span className="text-sm font-semibold text-green">
              Money Flowing In
            </span>
          </div>
          {inflows.length === 0 ? (
            <p className="text-xs text-text-muted">
              No sectors with positive flow today.
            </p>
          ) : (
            <div className="space-y-2">
              {inflows.map((s) => (
                <FlowBar
                  key={s.sector}
                  sector={s.sector}
                  change={s.avg_change_pct}
                  maxAbs={maxAbs}
                  positive
                />
              ))}
            </div>
          )}
        </div>

        {/* Outflows */}
        <div className="rounded-xl border border-red/20 bg-red/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ArrowDownRight className="h-4 w-4 text-red" />
            <span className="text-sm font-semibold text-red">
              Money Flowing Out
            </span>
          </div>
          {outflows.length === 0 ? (
            <p className="text-xs text-text-muted">
              No sectors with negative flow today.
            </p>
          ) : (
            <div className="space-y-2">
              {outflows.map((s) => (
                <FlowBar
                  key={s.sector}
                  sector={s.sector}
                  change={s.avg_change_pct}
                  maxAbs={maxAbs}
                  positive={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FlowBar({
  sector,
  change,
  maxAbs,
  positive,
}: {
  sector: string;
  change: number;
  maxAbs: number;
  positive: boolean;
}) {
  const width = Math.max(8, (Math.abs(change) / maxAbs) * 100);

  return (
    <div className="group">
      <div className="mb-0.5 flex items-center justify-between">
        <span className="text-xs font-medium text-text-primary">{sector}</span>
        <span
          className={`text-xs font-bold ${positive ? "text-green" : "text-red"}`}
        >
          {formatPercent(change)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg-primary">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            positive ? "bg-green" : "bg-red"
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
