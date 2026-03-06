import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { RsLinePoint } from "../lib/rs-engine";

interface Props {
  data: RsLinePoint[];
  ticker: string;
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  return (
    <div className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-text-primary">{fmtDate(label)}</p>
      <p style={{ color: val >= 1 ? "#22c55e" : "#ef4444" }}>
        RS Ratio: {val.toFixed(3)}
      </p>
      <p className="text-text-muted">
        {val >= 1 ? "Outperforming SMA-200" : "Underperforming SMA-200"}
      </p>
    </div>
  );
}

export function RsLineChart({ data, ticker }: Props) {
  const step = Math.max(1, Math.floor(data.length / 8));
  const minVal = Math.min(...data.map((d) => d.ratio));
  const maxVal = Math.max(...data.map((d) => d.ratio));
  const padding = (maxVal - minVal) * 0.1 || 0.02;

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={`rsGrad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={step}
          />
          <YAxis
            domain={[minVal - padding, maxVal + padding]}
            tickFormatter={(v) => v.toFixed(2)}
            tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={45}
          />
          <ReferenceLine
            y={1}
            stroke="var(--color-text-muted)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{ value: "SMA-200", position: "right", fill: "var(--color-text-muted)", fontSize: 9 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="ratio"
            stroke="#22c55e"
            fill={`url(#rsGrad-${ticker})`}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
