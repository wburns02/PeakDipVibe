import { z } from "zod";

export const CompareRowSchema = z.object({
  date: z.string(),
  values: z.record(z.string(), z.number()),
});

export const CompareResponseSchema = z.object({
  tickers: z.array(z.string()),
  rows: z.array(CompareRowSchema),
  date_range: z.array(z.string()),
  trading_days: z.number(),
});

export const SparklineResponseSchema = z.object({
  ticker: z.string(),
  closes: z.array(z.number()),
  days: z.number(),
});

export const BacktestSignalSchema = z.object({
  date: z.string(),
  entry_price: z.number(),
  exit_date: z.string(),
  exit_price: z.number(),
  return_pct: z.number(),
  max_drawdown: z.number(),
  indicator_value: z.number(),
});

export const BacktestSummarySchema = z.object({
  total_signals: z.number(),
  win_rate: z.number(),
  avg_return: z.number(),
  best_return: z.number(),
  worst_return: z.number(),
  avg_drawdown: z.number(),
});

export const BacktestResponseSchema = z.object({
  ticker: z.string(),
  indicator: z.string(),
  threshold: z.number(),
  direction: z.string(),
  hold_days: z.number(),
  signals: z.array(BacktestSignalSchema),
  summary: BacktestSummarySchema,
});

export type CompareRow = z.infer<typeof CompareRowSchema>;
export type CompareResponse = z.infer<typeof CompareResponseSchema>;
export type SparklineResponse = z.infer<typeof SparklineResponseSchema>;
export type BacktestSignal = z.infer<typeof BacktestSignalSchema>;
export type BacktestResponse = z.infer<typeof BacktestResponseSchema>;
