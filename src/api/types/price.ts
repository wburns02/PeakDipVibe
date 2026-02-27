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

export type PriceRow = z.infer<typeof PriceRowSchema>;
export type ChartRow = z.infer<typeof ChartRowSchema>;
