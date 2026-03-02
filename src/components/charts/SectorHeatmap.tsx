import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Treemap, ResponsiveContainer } from "recharts";
import type { SectorPerformance } from "@/api/types/market";
import { getSectorColor } from "@/lib/colors";

interface SectorHeatmapProps {
  sectors: SectorPerformance[];
}

interface TreemapContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  avg_change_pct: number;
  fill: string;
}

function CustomContent(props: TreemapContentProps) {
  const { x, y, width, height, name, avg_change_pct, fill } = props;
  if (width < 40 || height < 30) return null;

  const sign = avg_change_pct >= 0 ? "+" : "";

  return (
    <g style={{ cursor: "pointer" }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        fillOpacity={0.7 + Math.min(Math.abs(avg_change_pct) / 5, 0.3)}
        stroke="#0f1117"
        strokeWidth={2}
        rx={4}
      />
      {width > 60 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="white"
            fontSize={width > 100 ? 12 : 10}
            fontWeight={600}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="white"
            fontSize={10}
            opacity={0.8}
          >
            {sign}
            {avg_change_pct.toFixed(2)}%
          </text>
        </>
      )}
    </g>
  );
}

export const SectorHeatmap = memo(function SectorHeatmap({ sectors }: SectorHeatmapProps) {
  const navigate = useNavigate();

  if (!sectors || sectors.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-text-muted">
        No sector data available
      </div>
    );
  }

  const treeData = sectors.map((s) => ({
    name: s.sector,
    size: s.ticker_count,
    avg_change_pct: s.avg_change_pct,
    fill: getSectorColor(s.sector),
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <Treemap
        data={treeData}
        dataKey="size"
        stroke="none"
        content={<CustomContent x={0} y={0} width={0} height={0} name="" avg_change_pct={0} fill="" />}
        isAnimationActive={false}
        onClick={(node) => {
          if (node?.name) {
            navigate(`/screener?sector=${encodeURIComponent(node.name)}`);
          }
        }}
      />
    </ResponsiveContainer>
  );
});
