import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { BacktestResult } from "../lib/backtest-engine";

export function EquityCurve({ result }: { result: BacktestResult }) {
  const data = result.equityCurve;
  const isPositive = data[data.length - 1]?.equity >= 10000;

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          Equity Curve
        </h3>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>Starting: $10,000</span>
          <span className="text-text-muted">&rarr;</span>
          <span
            className={`font-bold ${isPositive ? "text-green" : "text-red"}`}
          >
            ${data[data.length - 1]?.equity.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isPositive ? "var(--color-green)" : "var(--color-red)"}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={isPositive ? "var(--color-green)" : "var(--color-red)"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
              }}
              minTickGap={60}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
              width={50}
              domain={["auto", "auto"]}
            />
            <ReferenceLine
              y={10000}
              stroke="var(--color-border)"
              strokeDasharray="4 4"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [
                `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                "Equity",
              ]}
              labelFormatter={(label: string) => label}
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke={isPositive ? "var(--color-green)" : "var(--color-red)"}
              strokeWidth={2}
              fill="url(#equityGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
