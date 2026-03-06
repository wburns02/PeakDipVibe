import type { SectorRs } from "../lib/rs-engine";
import { rsScoreColor } from "../lib/rs-engine";

interface Props {
  sectors: SectorRs[];
}

export function SectorRsBar({ sectors }: Props) {
  return (
    <div className="space-y-2">
      {sectors.map((s) => {
        const color = rsScoreColor(s.avgScore);
        return (
          <div key={s.sector} className="flex items-center gap-3">
            <span className="w-[110px] shrink-0 truncate text-xs text-text-secondary">
              {s.sector}
            </span>
            <div className="flex flex-1 items-center gap-2">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-bg-hover">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${s.avgScore}%`, backgroundColor: color }}
                />
              </div>
              <span className="w-8 text-right text-xs font-bold tabular-nums" style={{ color }}>
                {s.avgScore}
              </span>
            </div>
            <span className="w-6 text-right text-[10px] text-text-muted">{s.count}</span>
          </div>
        );
      })}
    </div>
  );
}
