import { memo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface MiniSparklineProps {
  data: { value: number }[];
  color?: string;
  height?: number;
}

export const MiniSparkline = memo(function MiniSparkline({
  data,
  color = "#6366f1",
  height = 30,
}: MiniSparklineProps) {
  if (data.length === 0) return null;

  return (
    <div role="img" aria-label="Price sparkline">
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
});
