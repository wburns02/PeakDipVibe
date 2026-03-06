import { z } from "zod";

export const PatternSignalSchema = z.object({
  ticker: z.string(),
  name: z.string().nullable(),
  signal_date: z.string(),
  prev_close: z.number().nullable(),
  day0_open: z.number().nullable(),
  day0_high: z.number().nullable(),
  day0_close: z.number().nullable(),
  day0_volume: z.number().nullable(),
  gap_up_pct: z.number().nullable(),
  selloff_pct: z.number().nullable(),
  day1_close: z.number().nullable(),
  day1_volume: z.number().nullable(),
  volume_ratio: z.number().nullable(),
  recovery_pct: z.number().nullable(),
  signal_strength: z.number().nullable(),
  gap_score: z.number().nullable(),
  selloff_score: z.number().nullable(),
  volume_score: z.number().nullable(),
  catalyst_score: z.number().nullable(),
  catalyst_type: z.string().nullable(),
  catalyst_headline: z.string().nullable(),
  day2_close: z.number().nullable(),
  day5_close: z.number().nullable(),
  day10_close: z.number().nullable(),
  outcome_1d: z.number().nullable(),
  outcome_5d: z.number().nullable(),
  outcome_10d: z.number().nullable(),
  status: z.string().nullable(),
  sector: z.string().nullable(),
});

export type PatternSignal = z.infer<typeof PatternSignalSchema>;

export const CatalystBreakdownSchema = z.object({
  catalyst_type: z.string(),
  count: z.number(),
  avg_strength: z.number().nullable(),
  avg_return_1d: z.number().nullable(),
});

export type CatalystBreakdown = z.infer<typeof CatalystBreakdownSchema>;

export const SignalStatsSchema = z.object({
  total: z.number(),
  avg_strength: z.number(),
  avg_return_1d: z.number(),
  win_rate_1d: z.number(),
  avg_return_5d: z.number(),
  win_rate_5d: z.number(),
  by_catalyst: z.array(CatalystBreakdownSchema),
});

export type SignalStats = z.infer<typeof SignalStatsSchema>;

export interface SignalFilters {
  days?: number;
  min_strength?: number;
  status?: string;
  catalyst_type?: string;
  sector?: string;
  sort_by?: string;
  limit?: number;
  offset?: number;
}
