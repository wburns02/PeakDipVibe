import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import type { BacktestResult } from "../lib/backtest-engine";

export function TickerBreakdown({ result }: { result: BacktestResult }) {
  const data = result.tickerBreakdown.slice(0, 20);

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">
        Performance by Ticker
      </h3>

      {data.length > 3 && (
        <div className="mb-4 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <XAxis
                dataKey="ticker"
                tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
                tickFormatter={(v: number) => `${v}%`}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <ReferenceLine y={0} stroke="var(--color-border)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-bg-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${Number(value).toFixed(2)}%`, "Avg Return"]}
              />
              <Bar dataKey="avgReturn" radius={[3, 3, 0, 0]}>
                {data.map((d) => (
                  <Cell
                    key={d.ticker}
                    fill={d.avgReturn >= 0 ? "var(--color-green)" : "var(--color-red)"}
                    fillOpacity={0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="space-y-1">
        {data.map((d) => (
          <div
            key={d.ticker}
            className="flex items-center justify-between rounded-lg px-3 py-1.5 transition-colors hover:bg-bg-hover"
          >
            <Link
              to={`/ticker/${d.ticker}`}
              className="font-medium text-accent hover:underline text-sm"
            >
              {d.ticker}
            </Link>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-text-muted">{d.trades} trades</span>
              <span className={d.winRate >= 50 ? "text-green" : "text-red"}>
                {d.winRate.toFixed(0)}% win
              </span>
              <span
                className={`font-mono font-medium ${d.avgReturn >= 0 ? "text-green" : "text-red"}`}
              >
                {d.avgReturn >= 0 ? "+" : ""}
                {d.avgReturn.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
