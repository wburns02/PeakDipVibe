import { useState, useMemo } from "react";
import { useScreener } from "@/api/hooks/useScreener";
import { usePageTitle } from "@/hooks/usePageTitle";
import { computeSectorMetrics, getQuadrantMeta, type Quadrant } from "./lib/rotation";
import { RotationChart } from "./components/RotationChart";
import { SectorRanking } from "./components/SectorRanking";
import { Skeleton } from "@/components/ui/Skeleton";
import { RefreshCw, Info } from "lucide-react";

export function SectorRotationPage() {
  usePageTitle("Sector Rotation");

  const [selected, setSelected] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Fetch max stocks for sector analysis
  const { data: stocks, isLoading } = useScreener({
    limit: 200,
    sort_by: "ticker",
    sort_dir: "asc",
  });

  const sectors = useMemo(() => {
    if (!stocks) return [];
    return computeSectorMetrics(stocks);
  }, [stocks]);

  // Quadrant summaries
  const quadrantCounts = useMemo(() => {
    const counts: Record<Quadrant, number> = { leading: 0, weakening: 0, lagging: 0, improving: 0 };
    for (const s of sectors) counts[s.quadrant]++;
    return counts;
  }, [sectors]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <RefreshCw className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Sector Rotation</h1>
            <p className="text-sm text-text-muted">
              Relative strength &amp; momentum &mdash; where the money is flowing
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-accent/30 hover:text-text-primary"
        >
          <Info className="h-3.5 w-3.5" />
          How to Read
        </button>
      </div>

      {/* Guide */}
      {showGuide && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-2 animate-slideDown">
          <h3 className="text-sm font-semibold text-text-primary">Reading the Rotation Graph</h3>
          <p className="text-xs leading-relaxed text-text-secondary">
            The Relative Rotation Graph (RRG) maps each sector on two axes:
            <strong> Relative Strength</strong> (X) measures how a sector performs vs the market average.
            <strong> Momentum</strong> (Y) measures whether that strength is accelerating or decelerating.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["leading", "improving", "lagging", "weakening"] as Quadrant[]).map((q) => {
              const m = getQuadrantMeta(q);
              return (
                <div key={q} className="rounded-lg bg-bg-secondary p-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-[11px] font-semibold" style={{ color: m.color }}>{m.label}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-text-muted">{m.desc}</p>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-text-muted">
            Sectors typically rotate clockwise: Leading &rarr; Weakening &rarr; Lagging &rarr; Improving &rarr; Leading.
            Favor sectors in the Leading and Improving quadrants.
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-[350px] rounded-2xl" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Skeleton className="h-16" /><Skeleton className="h-16" />
            <Skeleton className="h-16" /><Skeleton className="h-16" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && sectors.length > 0 && (
        <>
          {/* RRG Chart */}
          <RotationChart sectors={sectors} onSelect={setSelected} selected={selected} />

          {/* Quadrant summary pills */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["leading", "improving", "weakening", "lagging"] as Quadrant[]).map((q) => {
              const m = getQuadrantMeta(q);
              return (
                <div key={q} className="rounded-xl border border-border bg-bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{m.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-text-primary">{quadrantCounts[q]}</span>
                    <span className="text-xs text-text-muted">sectors</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sector Rankings */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
              Sector Rankings
            </h2>
            <SectorRanking sectors={sectors} selected={selected} onSelect={setSelected} />
          </div>
        </>
      )}
    </div>
  );
}
