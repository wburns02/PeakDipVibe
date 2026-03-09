import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import { ScreenerResultSchema } from "@/api/types/screener";
import type { ScreenerResult } from "@/api/types/screener";
import { z } from "zod";
import { normalizeSector } from "@/lib/formatters";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/ui/Skeleton";
import { Info } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────

interface TreeNode {
  ticker: string;
  name: string;
  sector: string;
  exchange: string | null;
  change: number;
  value: number; // market cap or equal weight
  close: number;
  rsi: number | null;
}

interface LayoutRect {
  node: TreeNode;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SectorGroup {
  sector: string;
  children: TreeNode[];
  totalValue: number;
}

// ─── Squarified treemap layout ──────────────────────────────────

function squarify(
  nodes: { value: number }[],
  x: number,
  y: number,
  w: number,
  h: number
): { x: number; y: number; w: number; h: number }[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ x, y, w, h }];

  const total = nodes.reduce((s, n) => s + n.value, 0);
  if (total <= 0) return nodes.map(() => ({ x, y, w: 0, h: 0 }));

  const rects: { x: number; y: number; w: number; h: number }[] = new Array(nodes.length);
  layoutStrip(nodes, 0, nodes.length, x, y, w, h, total, rects);
  return rects;
}

function layoutStrip(
  nodes: { value: number }[],
  start: number,
  end: number,
  x: number,
  y: number,
  w: number,
  h: number,
  total: number,
  out: { x: number; y: number; w: number; h: number }[]
) {
  if (start >= end) return;
  if (end - start === 1) {
    out[start] = { x, y, w, h };
    return;
  }

  const horizontal = w >= h;
  let sumA = 0;
  const half = total / 2;
  let split = start;
  for (let i = start; i < end; i++) {
    if (sumA + nodes[i].value > half && i > start) break;
    sumA += nodes[i].value;
    split = i + 1;
  }
  if (split === start) split = start + 1;
  if (split === end) split = end - 1;

  const ratioA = sumA / total;
  const sumB = total - sumA;

  if (horizontal) {
    const wA = w * ratioA;
    layoutStrip(nodes, start, split, x, y, wA, h, sumA, out);
    layoutStrip(nodes, split, end, x + wA, y, w - wA, h, sumB, out);
  } else {
    const hA = h * ratioA;
    layoutStrip(nodes, start, split, x, y, w, hA, sumA, out);
    layoutStrip(nodes, split, end, x, y + hA, w, h - hA, sumB, out);
  }
}

// ─── Color helpers ──────────────────────────────────────────────

const SECTOR_COLORS: Record<string, string> = {
  "Information Technology": "#6366f1",
  "Health Care": "#22c55e",
  "Financials": "#eab308",
  "Consumer Discretionary": "#f97316",
  "Communication Services": "#ec4899",
  "Industrials": "#8b5cf6",
  "Consumer Staples": "#14b8a6",
  "Energy": "#ef4444",
  "Utilities": "#06b6d4",
  "Real Estate": "#a855f7",
  "Materials": "#78716c",
};

function changeBg(pct: number): string {
  if (pct > 3) return "rgba(22, 163, 74, 0.85)";
  if (pct > 1.5) return "rgba(34, 197, 94, 0.7)";
  if (pct > 0.5) return "rgba(34, 197, 94, 0.45)";
  if (pct > 0) return "rgba(34, 197, 94, 0.25)";
  if (pct === 0) return "rgba(107, 114, 128, 0.3)";
  if (pct > -0.5) return "rgba(239, 68, 68, 0.25)";
  if (pct > -1.5) return "rgba(239, 68, 68, 0.45)";
  if (pct > -3) return "rgba(239, 68, 68, 0.7)";
  return "rgba(220, 38, 38, 0.85)";
}

// ─── Component ──────────────────────────────────────────────────

export function HeatmapPage() {
  usePageTitle("Market Heatmap");
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 360, h: 400 });
  const [hovered, setHovered] = useState<TreeNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [sizeBy, setSizeBy] = useState<"mcap" | "equal">("mcap");
  const [exchangeFilter, setExchangeFilter] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  // Fetch all stocks in 3 batches
  const batches = useQueries({
    queries: [0, 200, 400].map((offset) => ({
      queryKey: ["heatmap-stocks", offset, exchangeFilter],
      queryFn: async () => {
        const params: Record<string, unknown> = { limit: 200, offset, sort_by: "ticker", sort_dir: "asc" };
        if (exchangeFilter) params.exchange = exchangeFilter;
        const { data } = await api.get("/screener", { params });
        return z.array(ScreenerResultSchema).parse(data);
      },
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = batches.some((q) => q.isLoading);
  const batch0 = batches[0]?.data;
  const batch1 = batches[1]?.data;
  const batch2 = batches[2]?.data;
  const allStocks = useMemo(() => {
    const seen = new Set<string>();
    const result: ScreenerResult[] = [];
    for (const data of [batch0, batch1, batch2]) {
      if (!data) continue;
      for (const stock of data) {
        if (!seen.has(stock.ticker)) {
          seen.add(stock.ticker);
          result.push(stock);
        }
      }
    }
    return result;
  }, [batch0, batch1, batch2]);

  // Build tree nodes
  const nodes = useMemo<TreeNode[]>(() => {
    return allStocks
      .filter((s) => s.change_pct != null && s.close != null)
      .map((s) => ({
        ticker: s.ticker,
        name: s.name ?? s.ticker,
        sector: normalizeSector(s.sector),
        exchange: s.exchange ?? null,
        change: s.change_pct!,
        value: sizeBy === "mcap" ? (s.market_cap ?? 1e9) : 1,
        close: s.close!,
        rsi: s.rsi_14 ?? null,
      }))
      .sort((a, b) => b.value - a.value);
  }, [allStocks, sizeBy]);

  // Group by sector
  const sectorGroups = useMemo<SectorGroup[]>(() => {
    const map = new Map<string, TreeNode[]>();
    for (const n of nodes) {
      if (selectedSector && n.sector !== selectedSector) continue;
      let arr = map.get(n.sector);
      if (!arr) { arr = []; map.set(n.sector, arr); }
      arr.push(n);
    }
    return [...map.entries()]
      .map(([sector, children]) => ({
        sector,
        children: children.sort((a, b) => b.value - a.value),
        totalValue: children.reduce((s, c) => s + c.value, 0),
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [nodes, selectedSector]);

  // Layout calculation
  const layout = useMemo<LayoutRect[]>(() => {
    if (sectorGroups.length === 0) return [];
    const { w, h } = containerSize;
    const totalValue = sectorGroups.reduce((s, g) => s + g.totalValue, 0);
    if (totalValue <= 0) return [];

    // First layout sectors
    const sectorRects = squarify(
      sectorGroups.map((g) => ({ value: g.totalValue })),
      0, 0, w, h
    );

    // Then layout stocks within each sector
    const result: LayoutRect[] = [];
    sectorGroups.forEach((group, i) => {
      const sr = sectorRects[i];
      if (!sr || sr.w < 1 || sr.h < 1) return;
      const PAD = 1;
      const stockRects = squarify(
        group.children.map((c) => ({ value: c.value })),
        sr.x + PAD, sr.y + PAD, sr.w - PAD * 2, sr.h - PAD * 2
      );
      group.children.forEach((child, j) => {
        const r = stockRects[j];
        if (r && r.w > 0 && r.h > 0) {
          result.push({ node: child, x: r.x, y: r.y, w: r.w, h: r.h });
        }
      });
    });
    return result;
  }, [sectorGroups, containerSize]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          w: entry.contentRect.width,
          h: Math.max(500, entry.contentRect.height),
        });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleClick = useCallback(
    (node: TreeNode) => navigate(`/ticker/${node.ticker}`),
    [navigate],
  );

  // Summary stats
  const stats = useMemo(() => {
    if (nodes.length === 0) return null;
    const up = nodes.filter((n) => n.change > 0).length;
    const down = nodes.filter((n) => n.change < 0).length;
    const avgChange = nodes.reduce((s, n) => s + n.change, 0) / nodes.length;
    return { total: nodes.length, up, down, avgChange };
  }, [nodes]);

  const sectors = useMemo(() => {
    const set = new Set(nodes.map((n) => n.sector));
    return [...set].sort();
  }, [nodes]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Market Heatmap</h1>
          <p className="mt-1 text-sm text-text-muted">
            {stats
              ? `${stats.total} stocks — ${stats.up} up, ${stats.down} down (avg ${stats.avgChange >= 0 ? "+" : ""}${stats.avgChange.toFixed(2)}%)`
              : "Loading market data..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Exchange filter */}
          <div className="flex rounded-lg border border-border bg-bg-card text-xs">
            {([
              [null, "All"],
              ["NYQ", "NYSE"],
              ["NMS", "NASDAQ"],
            ] as const).map(([val, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setExchangeFilter(val)}
                className={`px-3 py-1.5 transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  exchangeFilter === val ? "bg-accent text-white" : "text-text-secondary hover:text-accent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Size by toggle */}
          <div className="flex rounded-lg border border-border bg-bg-card text-xs">
            <button
              type="button"
              onClick={() => setSizeBy("mcap")}
              className={`rounded-l-lg px-3 py-1.5 transition-colors ${
                sizeBy === "mcap" ? "bg-accent text-white" : "text-text-secondary hover:text-accent"
              }`}
            >
              Market Cap
            </button>
            <button
              type="button"
              onClick={() => setSizeBy("equal")}
              className={`rounded-r-lg px-3 py-1.5 transition-colors ${
                sizeBy === "equal" ? "bg-accent text-white" : "text-text-secondary hover:text-accent"
              }`}
            >
              Equal Weight
            </button>
          </div>
        </div>
      </div>

      {/* Sector filter pills */}
      <div className="flex flex-wrap gap-1.5 pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedSector(null)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !selectedSector ? "bg-accent text-white" : "bg-bg-card text-text-secondary border border-border hover:border-accent hover:text-accent"
          }`}
        >
          All Sectors
        </button>
        {sectors.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSelectedSector(selectedSector === s ? null : s)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedSector === s ? "text-white" : "bg-bg-card text-text-secondary border border-border hover:text-accent"
            }`}
            style={selectedSector === s ? { backgroundColor: SECTOR_COLORS[s] ?? "#6366f1" } : undefined}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Heatmap */}
      {isLoading ? (
        <Skeleton className="h-[50vh] sm:h-[70vh] w-full rounded-xl" />
      ) : (
        <div
          ref={containerRef}
          className="relative h-[50vh] min-h-[320px] sm:h-[70vh] sm:min-h-[500px] overflow-hidden rounded-xl border border-border bg-bg-card"
          onMouseLeave={() => setHovered(null)}
        >
          <svg
            width={containerSize.w}
            height={containerSize.h}
            className="w-full h-full"
            viewBox={`0 0 ${containerSize.w} ${containerSize.h}`}
          >
            {layout.map(({ node, x, y, w, h }) => {
              const showTicker = w > 30 && h > 20;
              const showChange = w > 50 && h > 35;
              const showName = w > 80 && h > 50;
              const isHovered = hovered?.ticker === node.ticker;
              return (
                <g
                  key={node.ticker}
                  onClick={() => handleClick(node)}
                  onMouseEnter={(e) => {
                    setHovered(node);
                    setMousePos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={x + 0.5}
                    y={y + 0.5}
                    width={Math.max(0, w - 1)}
                    height={Math.max(0, h - 1)}
                    rx={2}
                    fill={changeBg(node.change)}
                    stroke={isHovered ? "#fff" : "rgba(0,0,0,0.15)"}
                    strokeWidth={isHovered ? 2 : 0.5}
                    className="transition-opacity duration-150"
                    opacity={hovered && !isHovered ? 0.5 : 1}
                  />
                  {showTicker && (
                    <text
                      x={x + w / 2}
                      y={y + (showChange ? h / 2 - (showName ? 8 : 2) : h / 2 + 4)}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={Math.min(14, w / 5)}
                      fontWeight="bold"
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)", pointerEvents: "none" }}
                    >
                      {node.ticker}
                    </text>
                  )}
                  {showChange && (
                    <text
                      x={x + w / 2}
                      y={y + h / 2 + (showName ? 4 : 12)}
                      textAnchor="middle"
                      fill="#fff"
                      fontSize={Math.min(11, w / 7)}
                      opacity={0.9}
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)", pointerEvents: "none" }}
                    >
                      {node.change >= 0 ? "+" : ""}{node.change.toFixed(2)}%
                    </text>
                  )}
                  {showName && (
                    <text
                      x={x + w / 2}
                      y={y + h / 2 + 18}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.6)"
                      fontSize={Math.min(9, w / 10)}
                      style={{ pointerEvents: "none" }}
                    >
                      {node.name.length > Math.floor(w / 6) ? node.name.slice(0, Math.floor(w / 6)) + "..." : node.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {hovered && (
            <div
              className="pointer-events-none fixed z-50 rounded-lg border border-border bg-bg-card/95 px-3 py-2 shadow-xl backdrop-blur-sm"
              style={{
                left: mousePos.x + 12,
                top: mousePos.y - 10,
                transform: mousePos.x > window.innerWidth - 250 ? "translateX(-110%)" : undefined,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-accent">{hovered.ticker}</span>
                <span
                  className="rounded px-1.5 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: changeBg(hovered.change),
                    color: "#fff",
                  }}
                >
                  {hovered.change >= 0 ? "+" : ""}{hovered.change.toFixed(2)}%
                </span>
              </div>
              <p className="mt-0.5 text-xs text-text-muted">{hovered.name}</p>
              <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                <span className="text-text-muted">Price</span>
                <span className="text-right text-text-primary">${hovered.close.toFixed(2)}</span>
                <span className="text-text-muted">Sector</span>
                <span className="text-right text-text-primary">{hovered.sector}</span>
                {hovered.exchange && (
                  <>
                    <span className="text-text-muted">Exchange</span>
                    <span className="text-right text-text-primary">{hovered.exchange === "NMS" ? "NASDAQ" : hovered.exchange === "NYQ" ? "NYSE" : hovered.exchange}</span>
                  </>
                )}
                {hovered.rsi != null && (
                  <>
                    <span className="text-text-muted">RSI</span>
                    <span className={`text-right ${hovered.rsi < 30 ? "text-green" : hovered.rsi > 70 ? "text-red" : "text-text-primary"}`}>
                      {hovered.rsi.toFixed(1)}
                    </span>
                  </>
                )}
                {sizeBy === "mcap" && hovered.value > 1e9 && (
                  <>
                    <span className="text-text-muted">Mkt Cap</span>
                    <span className="text-right text-text-primary">
                      {hovered.value >= 1e12
                        ? `$${(hovered.value / 1e12).toFixed(1)}T`
                        : `$${(hovered.value / 1e9).toFixed(0)}B`}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-text-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            Click any stock to view details
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span>-3%+</span>
          {[-3, -1.5, -0.5, 0, 0.5, 1.5, 3].map((v) => (
            <div
              key={v}
              className="h-4 w-6 rounded-sm"
              style={{ backgroundColor: changeBg(v) }}
            />
          ))}
          <span>+3%+</span>
        </div>
      </div>
    </div>
  );
}
