import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Award, AlertTriangle } from "lucide-react";
import { useSeasonalTrends } from "@/api/hooks/usePrices";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCurrentMonth } from "../lib/seasonality";

export function SeasonalBreakdown({ ticker }: { ticker: string }) {
  const { data: seasonal, isLoading } = useSeasonalTrends(ticker);
  const { month: currentMonth } = getCurrentMonth();

  if (isLoading) return <Skeleton className="h-96" />;
  if (!seasonal) return null;

  const best = seasonal.months.find((m) => m.month === seasonal.best_month);
  const worst = seasonal.months.find((m) => m.month === seasonal.worst_month);
  const current = seasonal.months.find((m) => m.month === currentMonth);

  if (!best || !worst) return null;

  return (
    <div className="space-y-4">
      {/* Current month spotlight */}
      {current && (
        <div
          className={`rounded-xl border-2 p-4 ${
            current.avg_return >= 0
              ? "border-green/30 bg-green/5"
              : "border-red/30 bg-red/5"
          }`}
        >
          <div className="flex flex-wrap items-center gap-4">
            {current.avg_return >= 0 ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green/20">
                <TrendingUp className="h-5 w-5 text-green" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red/20">
                <TrendingDown className="h-5 w-5 text-red" />
              </div>
            )}
            <div>
              <p className="text-sm text-text-muted">
                Current Month — {current.label}
              </p>
              <p
                className={`text-xl font-bold ${
                  current.avg_return >= 0 ? "text-green" : "text-red"
                }`}
              >
                {current.avg_return >= 0 ? "+" : ""}
                {current.avg_return.toFixed(2)}% avg
              </p>
            </div>
            <div className="ml-auto flex gap-6">
              <div className="text-right">
                <p className="text-xs text-text-muted">Win Rate</p>
                <p
                  className={`text-xl font-bold ${
                    current.win_rate >= 60
                      ? "text-green"
                      : current.win_rate <= 40
                        ? "text-red"
                        : "text-text-primary"
                  }`}
                >
                  {current.win_rate}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted">Sample</p>
                <p className="text-xl font-bold text-text-primary">
                  {current.years} yrs
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Big bar chart */}
      <div className="rounded-xl border border-border bg-bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-text-primary">
          Monthly Average Returns
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={seasonal.months}
              margin={{ top: 8, right: 8, bottom: 0, left: -10 }}
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                tickFormatter={(v: number) => `${v}%`}
                axisLine={false}
                tickLine={false}
                width={45}
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
                formatter={(value: any, _name: any, props: any) => [
                  `${Number(value).toFixed(2)}% avg | ${props.payload.median_return.toFixed(2)}% median | ${props.payload.win_rate}% win | ${props.payload.years}yr`,
                  props.payload.label,
                ]}
                labelFormatter={() => ""}
              />
              <Bar dataKey="avg_return" radius={[4, 4, 0, 0]}>
                {seasonal.months.map((m) => (
                  <Cell
                    key={m.month}
                    fill={
                      m.month === currentMonth
                        ? "var(--color-accent)"
                        : m.avg_return >= 0
                          ? "var(--color-green)"
                          : "var(--color-red)"
                    }
                    fillOpacity={m.month === currentMonth ? 1 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Best/Worst months */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-green/30 bg-green/5 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green/20">
            <Award className="h-5 w-5 text-green" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Best Month</p>
            <p className="text-lg font-bold text-green">{best.label}</p>
            <p className="text-xs text-text-muted">
              +{best.avg_return.toFixed(1)}% avg &middot; {best.win_rate}% win
              &middot; best +{best.best.toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-red/30 bg-red/5 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red/20">
            <AlertTriangle className="h-5 w-5 text-red" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Worst Month</p>
            <p className="text-lg font-bold text-red">{worst.label}</p>
            <p className="text-xs text-text-muted">
              {worst.avg_return.toFixed(1)}% avg &middot; {worst.win_rate}% win
              &middot; worst {worst.worst.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Stats table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted">
              <th className="px-3 py-2 text-left font-medium">Month</th>
              <th className="px-3 py-2 text-right font-medium">Avg Return</th>
              <th className="px-3 py-2 text-right font-medium">Median</th>
              <th className="px-3 py-2 text-right font-medium">Win Rate</th>
              <th className="px-3 py-2 text-right font-medium">Best</th>
              <th className="px-3 py-2 text-right font-medium">Worst</th>
              <th className="px-3 py-2 text-right font-medium">Years</th>
            </tr>
          </thead>
          <tbody>
            {seasonal.months.map((m) => (
              <tr
                key={m.month}
                className={`border-b border-border/50 transition-colors ${
                  m.month === currentMonth
                    ? "bg-accent/5"
                    : "hover:bg-bg-hover"
                }`}
              >
                <td
                  className={`px-3 py-2 font-medium ${
                    m.month === currentMonth
                      ? "text-accent"
                      : "text-text-primary"
                  }`}
                >
                  {m.label}
                  {m.month === currentMonth && (
                    <span className="ml-1 text-xs text-accent">(now)</span>
                  )}
                </td>
                <td
                  className={`px-3 py-2 text-right font-mono ${
                    m.avg_return >= 0 ? "text-green" : "text-red"
                  }`}
                >
                  {m.avg_return >= 0 ? "+" : ""}
                  {m.avg_return.toFixed(2)}%
                </td>
                <td
                  className={`px-3 py-2 text-right font-mono ${
                    m.median_return >= 0 ? "text-green" : "text-red"
                  }`}
                >
                  {m.median_return >= 0 ? "+" : ""}
                  {m.median_return.toFixed(2)}%
                </td>
                <td
                  className={`px-3 py-2 text-right font-mono ${
                    m.win_rate >= 60
                      ? "text-green"
                      : m.win_rate <= 40
                        ? "text-red"
                        : "text-text-secondary"
                  }`}
                >
                  {m.win_rate}%
                </td>
                <td className="px-3 py-2 text-right font-mono text-green">
                  +{m.best.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right font-mono text-red">
                  {m.worst.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right text-text-muted">
                  {m.years}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
