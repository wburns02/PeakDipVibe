import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ChartLevels } from "../lib/idea-engine";

interface Props {
  levels: ChartLevels;
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SetupChart({ levels }: Props) {
  const { data, entry, stopLoss, target } = levels;
  if (data.length < 2) return null;

  const allVals = [...data.map((d) => d.close), entry, stopLoss, target];
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const pad = (max - min) * 0.08;

  return (
    <div className="h-[160px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 50, left: -10, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fill: "var(--color-text-muted)", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(data.length / 5)}
          />
          <YAxis
            domain={[min - pad, max + pad]}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            tick={{ fill: "var(--color-text-muted)", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={45}
          />
          <Tooltip
            formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(2)}`, "Close"]}
            labelFormatter={(d: unknown) => fmtDate(String(d))}
            contentStyle={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 11,
            }}
          />
          <ReferenceLine
            y={entry}
            stroke="#3b82f6"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: `Entry $${entry.toFixed(0)}`, position: "right", fill: "#3b82f6", fontSize: 9 }}
          />
          <ReferenceLine
            y={stopLoss}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: `Stop $${stopLoss.toFixed(0)}`, position: "right", fill: "#ef4444", fontSize: 9 }}
          />
          <ReferenceLine
            y={target}
            stroke="#22c55e"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: `Target $${target.toFixed(0)}`, position: "right", fill: "#22c55e", fontSize: 9 }}
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
