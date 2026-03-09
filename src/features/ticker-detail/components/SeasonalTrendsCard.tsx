import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
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
import { useSeasonalTrends } from "@/api/hooks/usePrices";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function SeasonalTrendsCard({ ticker }: { ticker: string }) {
  const { data: seasonal, isLoading } = useSeasonalTrends(ticker);

  if (isLoading) return <Skeleton className="h-64" />;
  if (!seasonal) return null;

  const best = seasonal.months[seasonal.best_month - 1];
  const worst = seasonal.months[seasonal.worst_month - 1];

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text-primary">
          Seasonal Trends
        </h3>
        <span className="ml-auto text-xs text-text-muted">
          {seasonal.years_analyzed} yrs
        </span>
      </div>

      {/* Bar chart */}
      <div className="h-36" role="img" aria-label="Monthly seasonal performance bar chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={seasonal.months}
            margin={{ top: 4, right: 0, bottom: 0, left: -20 }}
          >
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
              tickFormatter={(v: number) => `${v}%`}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <ReferenceLine y={0} stroke="var(--color-border)" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, _name: any, props: any) => [
                `${Number(value).toFixed(2)}% avg (${props.payload.win_rate}% win rate, ${props.payload.years} yrs)`,
                props.payload.label,
              ]}
              labelFormatter={() => ""}
            />
            <Bar dataKey="avg_return" radius={[3, 3, 0, 0]}>
              {seasonal.months.map((m) => (
                <Cell
                  key={m.month}
                  fill={
                    m.month === seasonal.best_month
                      ? "var(--color-green)"
                      : m.month === seasonal.worst_month
                        ? "var(--color-red)"
                        : m.avg_return >= 0
                          ? "var(--color-green)"
                          : "var(--color-red)"
                  }
                  fillOpacity={
                    m.month === seasonal.best_month || m.month === seasonal.worst_month
                      ? 1
                      : 0.5
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Best/worst months */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-green/10 px-2 py-1.5">
          <TrendingUp className="h-3 w-3 text-green" />
          <div>
            <p className="text-xs text-text-muted">Best Month</p>
            <p className="text-xs font-semibold text-green">
              {best.label} +{best.avg_return}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-red/10 px-2 py-1.5">
          <TrendingDown className="h-3 w-3 text-red" />
          <div>
            <p className="text-xs text-text-muted">Worst Month</p>
            <p className="text-xs font-semibold text-red">
              {worst.label} {worst.avg_return}%
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
