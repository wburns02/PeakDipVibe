import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useSimulation } from "@/api/hooks/useEarnings";
import { Card } from "@/components/ui/Card";
import type { SimStrategy } from "@/api/types/earnings";

export function SimulatorPage() {
  const [searchParams] = useSearchParams();
  const ticker = searchParams.get("ticker") || "";
  const signalDate = searchParams.get("date") || "";

  const [manualTicker, setManualTicker] = useState(ticker);
  const [manualDate, setManualDate] = useState(signalDate);
  const [activeTicker, setActiveTicker] = useState(ticker);
  const [activeDate, setActiveDate] = useState(signalDate);

  const { data: sim, isLoading, isError } = useSimulation(activeTicker, activeDate);

  const handleSearch = () => {
    if (manualTicker && manualDate) {
      setActiveTicker(manualTicker.toUpperCase());
      setActiveDate(manualDate);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <section>
        <h1 className="text-2xl font-bold text-text-primary">
          Event Simulator
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Replay any past gap-up event day by day. See what actually happened,
          compare to similar events, and explore "what if" strategies.
        </p>
      </section>

      {/* Search bar */}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-text-muted">Ticker</label>
            <input
              type="text"
              value={manualTicker}
              onChange={(e) => setManualTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="w-28 rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">
              Signal Date
            </label>
            <input
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              className="rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/80"
          >
            Simulate
          </button>
        </div>
      </Card>

      {/* Loading / Error / Empty */}
      {isLoading && (
        <Card>
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        </Card>
      )}

      {isError && (
        <Card>
          <p className="text-sm text-red-400">
            Could not load simulation data. Check the ticker and date.
          </p>
        </Card>
      )}

      {!activeTicker && !isLoading && (
        <Card>
          <p className="text-sm text-text-muted">
            Enter a ticker and signal date above, or click "Simulate" on any
            event from the Earnings page.
          </p>
        </Card>
      )}

      {/* Results */}
      {sim && !("error" in sim) && (
        <>
          {/* Header card */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-text-primary">
                  {sim.ticker}{" "}
                  <span className="text-text-muted font-normal">
                    — {sim.name}
                  </span>
                </h2>
                <p className="text-xs text-text-muted">
                  {sim.signal_date} · {sim.sector}
                  {sim.catalyst_type && ` · ${sim.catalyst_type}`}
                </p>
              </div>
              <div className="flex gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-emerald-400">
                    +{sim.gap_up_pct?.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-text-muted">Gap Up</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-red-400">
                    -{sim.selloff_pct?.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-text-muted">Selloff</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-accent">
                    {sim.signal_strength}
                  </p>
                  <p className="text-[10px] text-text-muted">Strength</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Timeline chart */}
          {sim.timeline.length > 0 && (
            <Card>
              <h3 className="mb-2 text-sm font-semibold text-text-primary">
                Price Timeline (% from Prev Close)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={sim.timeline}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                      tickFormatter={(d: string) => d.slice(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                      tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v}%`}
                      domain={["dataMin - 1", "dataMax + 1"]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1e2e",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number | undefined) =>
                        v != null
                          ? [`${v >= 0 ? "+" : ""}${v.toFixed(2)}%`, "% Change"]
                          : ["—", "% Change"]
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="pct_from_prev_close"
                      stroke="#14b8a6"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#14b8a6", stroke: "#0d1117", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Strategy comparison */}
          {sim.strategies.length > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-text-primary">
                Strategy Comparison — "What If?"
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {sim.strategies.map((s) => (
                  <StrategyCard key={s.name} strategy={s} />
                ))}
              </div>
            </Card>
          )}

          {/* Similar events */}
          {sim.analogs.length > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-text-primary">
                Similar Past Events
              </h3>
              <p className="mb-3 text-xs text-text-muted">
                Events with the closest gap-up % to this one. Shows how similar
                situations played out.
              </p>

              {/* Analog comparison chart — merge paths into unified data */}
              {(() => {
                // Build unified data array from all analog paths
                const stages = sim.analogs[0]?.path.map((p) => p.stage) ?? [];
                const chartData = stages.map((stage, idx) => {
                  const point: Record<string, string | number> = { stage };
                  sim.analogs.forEach((a, ai) => {
                    point[`analog_${ai}`] = a.path[idx]?.value ?? 0;
                  });
                  return point;
                });
                const colors = ["#f59e0b", "#8b5cf6", "#ec4899"];
                return (
                  <div className="mb-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.06)"
                        />
                        <XAxis
                          dataKey="stage"
                          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                          tickFormatter={(v: number) => `$${v}`}
                          domain={["dataMin - 1", "dataMax + 1"]}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#1a1e2e",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        {sim.analogs.map((a, i) => (
                          <Line
                            key={a.ticker + a.signal_date}
                            dataKey={`analog_${i}`}
                            name={`${a.ticker} (${a.signal_date.slice(5)})`}
                            stroke={colors[i % colors.length]}
                            strokeWidth={1.5}
                            dot={{ r: 3 }}
                            type="monotone"
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}

              <div className="space-y-2">
                {sim.analogs.map((a) => {
                  const outcome1d = a.outcome_1d ?? 0;
                  return (
                    <div
                      key={a.ticker + a.signal_date}
                      className="flex items-center justify-between rounded-lg bg-bg-hover/50 p-2.5"
                    >
                      <div>
                        <p className="text-xs font-medium text-text-primary">
                          {a.ticker}{" "}
                          <span className="text-text-muted">
                            — {a.name} · {a.signal_date}
                          </span>
                        </p>
                        <p className="text-[10px] text-text-muted">
                          Gap: +{a.gap_up_pct?.toFixed(1)}% · Selloff:{" "}
                          {a.selloff_pct?.toFixed(1)}%
                        </p>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span
                          className={
                            outcome1d >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }
                        >
                          1d: {outcome1d >= 0 ? "+" : ""}
                          {a.outcome_1d?.toFixed(1)}%
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            a.status === "confirmed"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : a.status === "failed"
                                ? "bg-red-500/15 text-red-400"
                                : "bg-amber-500/15 text-amber-400"
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StrategyCard({ strategy: s }: { strategy: SimStrategy }) {
  return (
    <div className="rounded-lg border border-border bg-bg-hover/30 p-3">
      <p className="text-xs font-bold text-text-primary">{s.name}</p>
      <p className="mt-0.5 text-[10px] text-text-muted">{s.description}</p>
      <p className="mt-1 text-[10px] text-text-muted">
        Entry: ${s.entry_price.toFixed(2)}
      </p>
      <div className="mt-2 flex gap-3 text-xs">
        {s.return_1d != null && (
          <span
            className={
              s.return_1d >= 0 ? "text-emerald-400" : "text-red-400"
            }
          >
            1d: {s.return_1d >= 0 ? "+" : ""}
            {s.return_1d.toFixed(2)}%
          </span>
        )}
        {s.return_5d != null && (
          <span
            className={
              s.return_5d >= 0 ? "text-emerald-400" : "text-red-400"
            }
          >
            5d: {s.return_5d >= 0 ? "+" : ""}
            {s.return_5d.toFixed(2)}%
          </span>
        )}
        {s.return_10d != null && (
          <span
            className={
              s.return_10d >= 0 ? "text-emerald-400" : "text-red-400"
            }
          >
            10d: {s.return_10d >= 0 ? "+" : ""}
            {s.return_10d.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}
