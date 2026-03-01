import { z } from "zod";

// Impact Summary
export const ImpactCategorySchema = z.object({
  move_size: z.string(),
  total_events: z.number(),
  avg_gap_pct: z.number(),
  avg_selloff_pct: z.number(),
  avg_return_1d: z.number().nullable(),
  win_rate_1d: z.number().nullable(),
  avg_return_5d: z.number().nullable(),
  win_rate_5d: z.number().nullable(),
  avg_return_10d: z.number().nullable(),
  win_rate_10d: z.number().nullable(),
  avg_intraday_peak_pct: z.number().nullable(),
  avg_intraday_dip_pct: z.number().nullable(),
  avg_next_day_recovery_pct: z.number().nullable(),
  avg_strength: z.number().nullable(),
  description: z.string(),
  emoji: z.string(),
});

export const ImpactSummarySchema = z.object({
  categories: z.array(ImpactCategorySchema),
  totals: z.object({
    total: z.number(),
    avg_gap: z.number().nullable(),
    avg_return_1d: z.number().nullable(),
    win_rate_1d: z.number().nullable(),
  }),
});

export type ImpactSummary = z.infer<typeof ImpactSummarySchema>;
export type ImpactCategory = z.infer<typeof ImpactCategorySchema>;

// Price Journey
export const PriceStageSchema = z.object({
  stage: z.string(),
  hour: z.number().optional(),
  value: z.number(),
  label: z.string(),
  explanation: z.string(),
});

export const PriceJourneySchema = z.object({
  move_size: z.string(),
  sample_size: z.number(),
  stages: z.array(PriceStageSchema),
});

export type PriceJourney = z.infer<typeof PriceJourneySchema>;
export type PriceStage = z.infer<typeof PriceStageSchema>;

// This Week Events
export const WeekEventSchema = z.object({
  ticker: z.string(),
  name: z.string().nullable(),
  sector: z.string().nullable(),
  signal_date: z.string(),
  prev_close: z.number().nullable(),
  day0_open: z.number().nullable(),
  day0_high: z.number().nullable(),
  day0_close: z.number().nullable(),
  day0_volume: z.number().nullable(),
  gap_up_pct: z.number().nullable(),
  selloff_pct: z.number().nullable(),
  day1_close: z.number().nullable(),
  recovery_pct: z.number().nullable(),
  volume_ratio: z.number().nullable(),
  outcome_1d: z.number().nullable(),
  outcome_5d: z.number().nullable(),
  signal_strength: z.number().nullable(),
  status: z.string().nullable(),
  move_size: z.string(),
  explanation: z.string(),
  verdict: z.string(),
  verdict_label: z.string(),
  verdict_emoji: z.string(),
});

export const ThisWeekSchema = z.object({
  week_start: z.string(),
  week_end: z.string(),
  total_events: z.number(),
  major_events: z.number(),
  bounce_rate: z.number().nullable(),
  events: z.array(WeekEventSchema),
});

export type ThisWeek = z.infer<typeof ThisWeekSchema>;
export type WeekEvent = z.infer<typeof WeekEventSchema>;

// Sector Breakdown
export const SectorDataSchema = z.object({
  sector: z.string(),
  total_events: z.number(),
  avg_gap: z.number().nullable(),
  avg_return_1d: z.number().nullable(),
  win_rate_1d: z.number().nullable(),
  avg_selloff: z.number().nullable(),
  big_moves: z.number(),
});

export const SectorBreakdownSchema = z.object({
  days: z.number(),
  sectors: z.array(SectorDataSchema),
});

export type SectorBreakdown = z.infer<typeof SectorBreakdownSchema>;
export type SectorData = z.infer<typeof SectorDataSchema>;
