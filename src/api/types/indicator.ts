import { z } from "zod";

export const IndicatorSnapshotSchema = z.object({
  ticker: z.string(),
  date: z.string(),
  indicators: z.record(z.string(), z.number().nullable()),
});

export const IndicatorHistoryRowSchema = z.object({
  date: z.string(),
  value: z.number().nullable(),
});

export type IndicatorSnapshot = z.infer<typeof IndicatorSnapshotSchema>;
export type IndicatorHistoryRow = z.infer<typeof IndicatorHistoryRowSchema>;
