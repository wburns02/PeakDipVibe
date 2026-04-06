import { z } from "zod";

export const PeakDipEventSchema = z.object({
  id: z.number(),
  ticker: z.string(),
  name: z.string().nullable(),
  sector: z.string().nullable(),
  market_cap_tier: z.string().nullable(),
  earnings_date: z.string().nullable(),
  signal_date: z.string(),
  prev_close: z.number().nullable(),
  gap_open: z.number().nullable(),
  gap_pct: z.number().nullable(),
  day_high: z.number().nullable(),
  day_close: z.number().nullable(),
  selloff_pct: z.number().nullable(),
  selloff_volume: z.number().nullable(),
  avg_volume: z.number().nullable(),
  volume_ratio: z.number().nullable(),
  catalyst_type: z.string().nullable(),
  catalyst_detail: z.string().nullable(),
  market_regime: z.string().nullable(),
  gap_bucket: z.string().nullable(),
  selloff_bucket: z.string().nullable(),
  outcome_1d: z.number().nullable(),
  outcome_3d: z.number().nullable(),
  outcome_5d: z.number().nullable(),
  outcome_10d: z.number().nullable(),
  outcome_20d: z.number().nullable(),
  win_1d: z.number().nullable(),
  win_5d: z.number().nullable(),
  win_10d: z.number().nullable(),
  pounce_score: z.number().nullable(),
  stage: z.string().nullable(),
  summary_auto: z.string().nullable(),
  summary_ai: z.string().nullable(),
  ai_provider: z.string().nullable(),
  ai_generated_at: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type PeakDipEvent = z.infer<typeof PeakDipEventSchema>;

export const TrackerSummarySchema = z.object({
  active_count: z.number(),
  avg_active_score: z.number().nullable(),
  recovering_count: z.number(),
  total_events: z.number(),
  overall_win_rate_5d: z.number().nullable(),
  resolved_count: z.number(),
  best_active_ticker: z.string().nullable(),
  best_active_score: z.number().nullable(),
});

export type TrackerSummary = z.infer<typeof TrackerSummarySchema>;

export const TrackerStatsSchema = z.object({
  total_events: z.number(),
  win_rate_5d: z.number().nullable(),
  avg_pounce_score: z.number().nullable(),
  by_catalyst: z.array(z.record(z.string(), z.unknown())).nullable(),
  by_sector: z.array(z.record(z.string(), z.unknown())).nullable(),
  by_gap_bucket: z.array(z.record(z.string(), z.unknown())).nullable(),
});

export type TrackerStats = z.infer<typeof TrackerStatsSchema>;

export interface TrackerFilters {
  stage?: string;
  days?: number;
  min_score?: number;
  catalyst_type?: string;
  sector?: string;
  limit?: number;
  offset?: number;
}
