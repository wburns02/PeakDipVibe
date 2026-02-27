import { Card } from "@/components/ui/Card";
import { SectorHeatmap } from "@/components/charts/SectorHeatmap";
import type { SectorPerformance } from "@/api/types/market";

interface SectorHeatmapCardProps {
  sectors: SectorPerformance[];
}

export function SectorHeatmapCard({ sectors }: SectorHeatmapCardProps) {
  if (sectors.length === 0) return null;

  return (
    <Card title="Sector Performance" subtitle="Daily change by GICS sector">
      <SectorHeatmap sectors={sectors} />
    </Card>
  );
}
