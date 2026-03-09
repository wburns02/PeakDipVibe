import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Label,
} from "recharts";
import { Radar, Search, TrendingUp, TrendingDown, AlertTriangle, Zap, Filter, X } from "lucide-react";
import { useScreener } from "@/api/hooks/useScreener";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { MiniLesson } from "@/components/education/MiniLesson";
import type { ScreenerResult } from "@/api/types/screener";

// ─── Sector Colors ──────────────────────────────────────────────────────────

const SECTOR_COLORS: Record<string, string> = {
  "Technology": "#818cf8",
  "Information Technology": "#818cf8",
  "Health Care": "#34d399",
  "Financials": "#fbbf24",
  "Consumer Discretionary": "#f472b6",
  "Communication Services": "#60a5fa",
  "Industrials": "#a78bfa",
  "Consumer Staples": "#4ade80",
  "Energy": "#fb923c",
  "Utilities": "#94a3b8",
  "Real Estate": "#c084fc",
  "Materials": "#2dd4bf",
};

const DEFAULT_COLOR = "#64748b";

function getSectorColor(sector: string | null): string {
  if (!sector) return DEFAULT_COLOR;
  return SECTOR_COLORS[sector] ?? DEFAULT_COLOR;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface RadarPoint {
  ticker: string;
  name: string | null;
  sector: string | null;
  rsi: number;
  distFromSma200: number;
  changePct: number;
  close: number | null;
  color: string;
  quadrant: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getQuadrant(rsi: number, dist: number): string {
  if (rsi >= 50 && dist >= 0) return "Strong Trend";
  if (rsi < 50 && dist >= 0) return "Pullback Zone";
  if (rsi >= 50 && dist < 0) return "Bear Rally";
  return "Deep Value";
}

function buildRadarPoints(stocks: ScreenerResult[]): RadarPoint[] {
  return stocks
    .filter((s) => s.rsi_14 != null && s.close != null && s.sma_200 != null && s.sma_200 > 0)
    .map((s) => {
      const rsi = s.rsi_14!;
      const dist = ((s.close! - s.sma_200!) / s.sma_200!) * 100;
      return {
        ticker: s.ticker,
        name: s.name,
        sector: s.sector,
        rsi,
        distFromSma200: Math.round(dist * 100) / 100,
        changePct: s.change_pct ?? 0,
        close: s.close,
        color: getSectorColor(s.sector),
        quadrant: getQuadrant(rsi, dist),
      };
    });
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

function RadarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: RadarPoint }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: d.color }}
        />
        <span className="text-sm font-bold text-text-primary">{d.ticker}</span>
        <span className="text-xs text-text-muted">{d.name}</span>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
        <span className="text-text-muted">RSI(14)</span>
        <span className={`font-medium ${d.rsi >= 70 ? "text-red-400" : d.rsi <= 30 ? "text-green-400" : "text-text-primary"}`}>
          {d.rsi.toFixed(1)}
        </span>
        <span className="text-text-muted">vs SMA-200</span>
        <span className={`font-medium ${d.distFromSma200 >= 0 ? "text-green-400" : "text-red-400"}`}>
          {d.distFromSma200 >= 0 ? "+" : ""}{d.distFromSma200.toFixed(1)}%
        </span>
        <span className="text-text-muted">Today</span>
        <span className={`font-medium ${d.changePct >= 0 ? "text-green-400" : "text-red-400"}`}>
          {d.changePct >= 0 ? "+" : ""}{d.changePct.toFixed(2)}%
        </span>
        <span className="text-text-muted">Price</span>
        <span className="font-medium text-text-primary">${d.close?.toFixed(2)}</span>
        <span className="text-text-muted">Sector</span>
        <span className="font-medium text-text-primary">{d.sector ?? "N/A"}</span>
        <span className="text-text-muted">Quadrant</span>
        <span className="font-medium text-accent">{d.quadrant}</span>
      </div>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  icon: Icon,
  ticker,
  metric,
  sub,
  color,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ticker: string;
  metric: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-3">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium uppercase tracking-wider text-text-muted">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-accent">{ticker}</span>
            <span className="text-xs font-medium text-text-primary">{metric}</span>
          </div>
          <p className="truncate text-sm text-text-muted">{sub}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Sector Legend ───────────────────────────────────────────────────────────

function SectorLegend({
  sectors,
  activeSectors,
  onToggle,
}: {
  sectors: string[];
  activeSectors: Set<string>;
  onToggle: (s: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {sectors.map((s) => {
        const active = activeSectors.has(s);
        return (
          <button
            key={s}
            type="button"
            onClick={() => onToggle(s)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-3 text-sm font-medium transition-all ${
              active
                ? "border-transparent bg-bg-hover text-text-primary"
                : "border-border bg-transparent text-text-muted opacity-40 hover:opacity-70"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: getSectorColor(s) }}
            />
            {s}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function MomentumRadarPage() {
  usePageTitle("Momentum Radar");
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [activeSectors, setActiveSectors] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Fetch stocks — merge 3 sort variations to maximize coverage
  // In production (pre-computed JSON), each returns 200 unique → ~500 total
  // In dev (live API), indicator data covers ~50 stocks
  const { data: d1, isLoading: l1 } = useScreener({ sort_by: "rsi", sort_dir: "asc", limit: 200 });
  const { data: d2, isLoading: l2 } = useScreener({ sort_by: "change", sort_dir: "asc", limit: 200 });
  const { data: d3, isLoading: l3 } = useScreener({ sort_by: "price", sort_dir: "desc", limit: 200 });
  const isLoading = l1 || l2 || l3;

  const allStocks = useMemo(() => {
    const batches = [d1, d2, d3].filter(Boolean) as ScreenerResult[][];
    if (batches.length === 0) return [];
    const map = new Map<string, ScreenerResult>();
    for (const batch of batches) for (const s of batch) map.set(s.ticker, s);
    return [...map.values()];
  }, [d1, d2, d3]);

  const allPoints = useMemo(() => buildRadarPoints(allStocks ?? []), [allStocks]);

  // Initialize sector filters once data loads
  const allSectors = useMemo(() => {
    const set = new Set<string>();
    for (const p of allPoints) if (p.sector) set.add(p.sector);
    return [...set].sort();
  }, [allPoints]);

  if (!initialized && allSectors.length > 0) {
    setActiveSectors(new Set(allSectors));
    setInitialized(true);
  }

  const toggleSector = useCallback((s: string) => {
    setActiveSectors((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }, []);

  // Filtered points
  const filteredPoints = useMemo(() => {
    let pts = allPoints;
    if (activeSectors.size > 0 && activeSectors.size < allSectors.length) {
      pts = pts.filter((p) => p.sector && activeSectors.has(p.sector));
    }
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      pts = pts.filter((p) => p.ticker.includes(q) || (p.name && p.name.toUpperCase().includes(q)));
    }
    return pts;
  }, [allPoints, activeSectors, allSectors.length, search]);

  // Highlighted point (search match)
  const highlighted = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toUpperCase();
    return filteredPoints.find((p) => p.ticker === q) ?? null;
  }, [filteredPoints, search]);

  // KPI computations
  const kpis = useMemo(() => {
    if (allPoints.length === 0) return null;
    const sorted = [...allPoints];

    const mostOverbought = sorted.reduce((a, b) => (a.rsi > b.rsi ? a : b));
    const mostOversold = sorted.reduce((a, b) => (a.rsi < b.rsi ? a : b));
    const strongest = sorted.reduce((a, b) => (a.distFromSma200 > b.distFromSma200 ? a : b));
    const weakest = sorted.reduce((a, b) => (a.distFromSma200 < b.distFromSma200 ? a : b));

    const quadrants = { "Strong Trend": 0, "Pullback Zone": 0, "Bear Rally": 0, "Deep Value": 0 };
    for (const p of allPoints) {
      quadrants[p.quadrant as keyof typeof quadrants]++;
    }

    return { mostOverbought, mostOversold, strongest, weakest, quadrants, total: allPoints.length };
  }, [allPoints]);

  const handleDotClick = useCallback(
    (data: RadarPoint) => {
      navigate(`/ticker/${data.ticker}`);
    },
    [navigate],
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Momentum Radar</h1>
          <p className="text-sm text-text-muted">Loading market data...</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-20" />))}
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-accent" />
            <h1 className="text-xl font-bold text-text-primary">Momentum Radar</h1>
          </div>
          <p className="text-sm text-text-muted">
            {filteredPoints.length} of {allPoints.length} stocks plotted by RSI and trend position
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find ticker... (e.g. AAPL)"
            className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-9 pr-8 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            label="Most Overbought"
            icon={AlertTriangle}
            ticker={kpis.mostOverbought.ticker}
            metric={`RSI ${kpis.mostOverbought.rsi.toFixed(0)}`}
            sub={kpis.mostOverbought.name ?? ""}
            color="bg-red-500/80"
          />
          <KpiCard
            label="Most Oversold"
            icon={Zap}
            ticker={kpis.mostOversold.ticker}
            metric={`RSI ${kpis.mostOversold.rsi.toFixed(0)}`}
            sub={kpis.mostOversold.name ?? ""}
            color="bg-green-500/80"
          />
          <KpiCard
            label="Strongest Trend"
            icon={TrendingUp}
            ticker={kpis.strongest.ticker}
            metric={`+${kpis.strongest.distFromSma200.toFixed(1)}%`}
            sub={kpis.strongest.name ?? ""}
            color="bg-accent/80"
          />
          <KpiCard
            label="Weakest Trend"
            icon={TrendingDown}
            ticker={kpis.weakest.ticker}
            metric={`${kpis.weakest.distFromSma200.toFixed(1)}%`}
            sub={kpis.weakest.name ?? ""}
            color="bg-orange-500/80"
          />
        </div>
      )}

      {/* Quadrant Summary */}
      {kpis && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {(["Strong Trend", "Pullback Zone", "Bear Rally", "Deep Value"] as const).map((q) => {
            const count = kpis.quadrants[q];
            const pct = ((count / kpis.total) * 100).toFixed(0);
            const colors: Record<string, string> = {
              "Strong Trend": "border-green-500/30 bg-green-500/5 text-green-400",
              "Pullback Zone": "border-yellow-500/30 bg-yellow-500/5 text-yellow-400",
              "Bear Rally": "border-orange-500/30 bg-orange-500/5 text-orange-400",
              "Deep Value": "border-red-500/30 bg-red-500/5 text-red-400",
            };
            return (
              <div key={q} className={`rounded-lg border p-2.5 text-center ${colors[q]}`}>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-sm font-medium uppercase tracking-wider">{q}</p>
                <p className="text-sm opacity-70">{pct}% of market</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Sector Filter */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-text-muted" />
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Sector Filter</span>
          {activeSectors.size < allSectors.length && (
            <button
              type="button"
              onClick={() => setActiveSectors(new Set(allSectors))}
              className="ml-auto text-sm text-accent hover:underline"
            >
              Show all
            </button>
          )}
        </div>
        <SectorLegend sectors={allSectors} activeSectors={activeSectors} onToggle={toggleSector} />
      </Card>

      {/* Scatter Chart */}
      <Card className="overflow-hidden">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Market Momentum Map</h3>
            <p className="text-sm text-text-muted">Click any dot to view stock detail. Dot size = daily change magnitude.</p>
          </div>
          {highlighted && (
            <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-bold text-accent">{highlighted.ticker}</span>
              <span className="text-sm text-text-muted">
                RSI {highlighted.rsi.toFixed(0)} / {highlighted.distFromSma200 >= 0 ? "+" : ""}{highlighted.distFromSma200.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <div className="h-[500px] md:h-[600px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />

              {/* Quadrant backgrounds */}
              <ReferenceArea x1={50} x2={100} y1={0} y2={100} fill="#22c55e" fillOpacity={0.03} />
              <ReferenceArea x1={0} x2={50} y1={0} y2={100} fill="#eab308" fillOpacity={0.03} />
              <ReferenceArea x1={50} x2={100} y1={-80} y2={0} fill="#f97316" fillOpacity={0.03} />
              <ReferenceArea x1={0} x2={50} y1={-80} y2={0} fill="#ef4444" fillOpacity={0.03} />

              {/* RSI midline */}
              <ReferenceLine x={50} stroke="var(--color-text-muted)" strokeDasharray="4 4" opacity={0.4}>
                <Label value="RSI 50" position="top" fill="var(--color-text-muted)" fontSize={10} />
              </ReferenceLine>

              {/* SMA-200 line */}
              <ReferenceLine y={0} stroke="var(--color-text-muted)" strokeDasharray="4 4" opacity={0.4}>
                <Label value="SMA-200" position="right" fill="var(--color-text-muted)" fontSize={10} />
              </ReferenceLine>

              {/* RSI danger zones */}
              <ReferenceLine x={30} stroke="#22c55e" strokeDasharray="2 4" opacity={0.3} />
              <ReferenceLine x={70} stroke="#ef4444" strokeDasharray="2 4" opacity={0.3} />

              <XAxis
                type="number"
                dataKey="rsi"
                name="RSI(14)"
                domain={[0, 100]}
                tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                label={{
                  value: "RSI(14) — Short-term Momentum",
                  position: "bottom",
                  offset: 10,
                  style: { fill: "var(--color-text-muted)", fontSize: 11 },
                }}
              />
              <YAxis
                type="number"
                dataKey="distFromSma200"
                name="% from SMA-200"
                tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                label={{
                  value: "% from SMA-200",
                  angle: -90,
                  position: "insideLeft",
                  offset: 0,
                  style: { fill: "var(--color-text-muted)", fontSize: 11 },
                }}
                tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v}%`}
              />
              <ZAxis
                type="number"
                dataKey="changePct"
                range={[30, 400]}
                name="Change %"
              />
              <Tooltip
                content={<RadarTooltip />}
                cursor={{ strokeDasharray: "3 3", stroke: "var(--color-text-muted)" }}
              />
              <Scatter
                data={filteredPoints}
                onClick={(data: unknown) => {
                  const point = data as RadarPoint;
                  if (point?.ticker) handleDotClick(point);
                }}
                cursor="pointer"
              >
                {filteredPoints.map((p, i) => (
                  <Cell
                    key={`${p.ticker}-${i}`}
                    fill={p.color}
                    fillOpacity={
                      highlighted
                        ? p.ticker === highlighted.ticker
                          ? 1
                          : 0.15
                        : 0.7
                    }
                    stroke={
                      highlighted && p.ticker === highlighted.ticker
                        ? "#fff"
                        : "transparent"
                    }
                    strokeWidth={highlighted && p.ticker === highlighted.ticker ? 2 : 0}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Quadrant labels overlay */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm font-medium md:grid-cols-4">
          <div className="rounded bg-yellow-500/10 py-1.5 text-yellow-400">
            Pullback Zone (RSI &lt; 50, Above SMA-200)
          </div>
          <div className="rounded bg-green-500/10 py-1.5 text-green-400">
            Strong Trend (RSI &gt; 50, Above SMA-200)
          </div>
          <div className="rounded bg-red-500/10 py-1.5 text-red-400">
            Deep Value (RSI &lt; 50, Below SMA-200)
          </div>
          <div className="rounded bg-orange-500/10 py-1.5 text-orange-400">
            Bear Rally (RSI &gt; 50, Below SMA-200)
          </div>
        </div>
      </Card>

      {/* Top Stocks Table per Quadrant */}
      <div className="grid gap-4 md:grid-cols-2">
        {(["Strong Trend", "Deep Value", "Pullback Zone", "Bear Rally"] as const).map((q) => {
          const qStocks = filteredPoints
            .filter((p) => p.quadrant === q)
            .sort((a, b) => {
              if (q === "Strong Trend") return b.distFromSma200 - a.distFromSma200;
              if (q === "Deep Value") return a.rsi - b.rsi;
              if (q === "Pullback Zone") return a.rsi - b.rsi;
              return b.rsi - a.rsi;
            })
            .slice(0, 8);

          const colors: Record<string, { border: string; badge: string; text: string }> = {
            "Strong Trend": { border: "border-green-500/20", badge: "bg-green-500/15 text-green-400", text: "text-green-400" },
            "Pullback Zone": { border: "border-yellow-500/20", badge: "bg-yellow-500/15 text-yellow-400", text: "text-yellow-400" },
            "Bear Rally": { border: "border-orange-500/20", badge: "bg-orange-500/15 text-orange-400", text: "text-orange-400" },
            "Deep Value": { border: "border-red-500/20", badge: "bg-red-500/15 text-red-400", text: "text-red-400" },
          };
          const c = colors[q];

          return (
            <Card key={q} className={c.border}>
              <div className="mb-3 flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${c.badge}`}>{q}</span>
                <span className="text-sm text-text-muted">{filteredPoints.filter((p) => p.quadrant === q).length} stocks</span>
              </div>
              {qStocks.length === 0 ? (
                <p className="py-4 text-center text-xs text-text-muted">No stocks in this quadrant</p>
              ) : (
                <div className="space-y-1">
                  {qStocks.map((s) => (
                    <button
                      key={s.ticker}
                      type="button"
                      onClick={() => navigate(`/ticker/${s.ticker}`)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-bg-hover"
                    >
                      <span className="w-14 text-xs font-bold text-accent">{s.ticker}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">{s.name}</span>
                      <span className="text-sm text-text-muted">RSI {s.rsi.toFixed(0)}</span>
                      <span className={`w-16 text-right text-sm font-medium ${s.distFromSma200 >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {s.distFromSma200 >= 0 ? "+" : ""}{s.distFromSma200.toFixed(1)}%
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Education */}
      <MiniLesson
        title="How to read the Momentum Radar"
        points={[
          "Each dot is a stock. The X-axis shows RSI (momentum speed) — below 30 is oversold, above 70 is overbought.",
          "The Y-axis shows how far the stock is from its 200-day moving average — positive means uptrend, negative means downtrend.",
          "Strong Trend (top-right): Stocks in solid uptrends with momentum. These are leaders.",
          "Deep Value (bottom-left): Stocks beaten down in both momentum and trend. Potential contrarian plays.",
          "Pullback Zone (top-left): Strong stocks taking a breather. Watch for RSI to bounce off 30-50 for entries.",
          "Bear Rally (bottom-right): Stocks below their long-term trend but showing short-term momentum. Proceed with caution.",
          "Dot size reflects today's price change magnitude. Bigger dots had bigger moves today.",
          "Click any dot to view detailed analysis for that stock.",
        ]}
      />
    </div>
  );
}
