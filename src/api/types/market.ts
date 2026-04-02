import { z } from "zod";

export const MoverSchema = z.object({
  ticker: z.string(),
  name: z.string().nullable(),
  sector: z.string().nullable(),
  close: z.number(),
  prev_close: z.number(),
  change_pct: z.number(),
});

export const SectorPerformanceSchema = z.object({
  sector: z.string(),
  ticker_count: z.number(),
  avg_change_pct: z.number(),
});

export const MarketOverviewSchema = z.object({
  total_tickers: z.number(),
  total_prices: z.number(),
  total_indicators: z.number(),
  date_min: z.string().nullable(),
  date_max: z.string().nullable(),
  sectors: z.array(SectorPerformanceSchema),
  top_gainers: z.array(MoverSchema),
  top_losers: z.array(MoverSchema),
});

export const MarketBreadthSchema = z.object({
  total_stocks: z.number(),
  advancers: z.number(),
  decliners: z.number(),
  unchanged: z.number(),
  advance_decline_ratio: z.number(),
  pct_above_sma50: z.number(),
  pct_above_sma200: z.number(),
  avg_rsi: z.number().nullable(),
  pct_oversold: z.number(),
  pct_overbought: z.number(),
});

export const BreadthHistoryEntrySchema = z.object({
  date: z.string(),
  score: z.number(),
  advancers: z.number().optional(),
  decliners: z.number().optional(),
  ad_ratio: z.number().optional(),
  pct_above_sma50: z.number().optional(),
  avg_rsi: z.number().nullable().optional(),
  source: z.string().optional(),
});

export type BreadthHistoryEntry = z.infer<typeof BreadthHistoryEntrySchema>;

export const StatusResponseSchema = z.object({
  total_tickers: z.number(),
  total_prices: z.number(),
  total_indicators: z.number(),
  date_min: z.string().nullable(),
  date_max: z.string().nullable(),
  db_size_mb: z.number(),
  last_update: z.string().nullable(),
});

export const UpcomingEarningSchema = z.object({
  ticker: z.string(),
  name: z.string().nullable(),
  sector: z.string().nullable(),
  earnings_date: z.string(),
  market_cap: z.number().nullable(),
});

export const UpcomingEarningsResponseSchema = z.object({
  earnings: z.array(UpcomingEarningSchema),
  last_refreshed: z.string().nullable(),
});

export type Mover = z.infer<typeof MoverSchema>;
export type SectorPerformance = z.infer<typeof SectorPerformanceSchema>;
export type MarketOverview = z.infer<typeof MarketOverviewSchema>;
export type MarketBreadth = z.infer<typeof MarketBreadthSchema>;
export type StatusResponse = z.infer<typeof StatusResponseSchema>;
export type UpcomingEarning = z.infer<typeof UpcomingEarningSchema>;
export type UpcomingEarningsResponse = z.infer<typeof UpcomingEarningsResponseSchema>;
