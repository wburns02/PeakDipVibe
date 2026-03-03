import { z } from "zod";

export const PriceRowSchema = z.object({
  date: z.string(),
  open: z.number().nullable(),
  high: z.number().nullable(),
  low: z.number().nullable(),
  close: z.number().nullable(),
  adj_close: z.number().nullable(),
  volume: z.number().nullable(),
});

export const ChartRowSchema = PriceRowSchema.extend({
  sma_10: z.number().nullable(),
  sma_20: z.number().nullable(),
  sma_50: z.number().nullable(),
  sma_200: z.number().nullable(),
  ema_12: z.number().nullable(),
  ema_50: z.number().nullable(),
  bb_upper: z.number().nullable(),
  bb_lower: z.number().nullable(),
  bb_middle: z.number().nullable(),
});

export const MonthlyReturnSchema = z.object({
  month: z.number(),
  label: z.string(),
  avg_return: z.number(),
  median_return: z.number(),
  win_rate: z.number(),
  best: z.number(),
  worst: z.number(),
  years: z.number(),
});

export const SeasonalResponseSchema = z.object({
  ticker: z.string(),
  years_analyzed: z.number(),
  months: z.array(MonthlyReturnSchema),
  best_month: z.number(),
  worst_month: z.number(),
});

export type PriceRow = z.infer<typeof PriceRowSchema>;
export type ChartRow = z.infer<typeof ChartRowSchema>;
export type MonthlyReturn = z.infer<typeof MonthlyReturnSchema>;
export type SeasonalResponse = z.infer<typeof SeasonalResponseSchema>;
