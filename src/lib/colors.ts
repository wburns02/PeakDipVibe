export const CHART_COLORS = {
  candle_up: "#22c55e",
  candle_down: "#ef4444",
  volume_up: "rgba(34, 197, 94, 0.3)",
  volume_down: "rgba(239, 68, 68, 0.3)",
  volume_anomaly_up: "rgba(34, 197, 94, 0.8)",
  volume_anomaly_down: "rgba(239, 68, 68, 0.8)",
  sma10: "#f59e0b",
  sma20: "#3b82f6",
  sma50: "#8b5cf6",
  sma200: "#ec4899",
  ema12: "#06b6d4",
  ema50: "#14b8a6",
  bbUpper: "rgba(148, 163, 184, 0.4)",
  bbLower: "rgba(148, 163, 184, 0.4)",
  bbMiddle: "rgba(148, 163, 184, 0.6)",
  grid: "#1e2235",
  crosshair: "#64748b",
  text: "#94a3b8",
  background: "#0f1117",
};

// Sector heatmap colors
export const SECTOR_COLORS: Record<string, string> = {
  "Information Technology": "#6366f1",
  Technology: "#6366f1",
  Healthcare: "#22c55e",
  Financials: "#f59e0b",
  "Financial Services": "#f59e0b",
  "Consumer Discretionary": "#ec4899",
  "Consumer Cyclical": "#ec4899",
  "Communication Services": "#3b82f6",
  Industrials: "#8b5cf6",
  "Consumer Staples": "#14b8a6",
  "Consumer Defensive": "#14b8a6",
  Energy: "#ef4444",
  Utilities: "#06b6d4",
  "Real Estate": "#f97316",
  Materials: "#a3e635",
  "Basic Materials": "#a3e635",
};

export function getSectorColor(sector: string): string {
  return SECTOR_COLORS[sector] ?? "#64748b";
}
