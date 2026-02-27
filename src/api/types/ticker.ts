import { z } from "zod";

export const TickerSummarySchema = z.object({
  ticker: z.string(),
  name: z.string().nullable(),
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  market_cap: z.number().nullable(),
  exchange: z.string().nullable(),
});

export const TickerDetailSchema = TickerSummarySchema.extend({
  latest_close: z.number().nullable().optional(),
  latest_date: z.string().nullable().optional(),
  indicators: z.record(z.string(), z.number().nullable()).default({}),
});

export type TickerSummary = z.infer<typeof TickerSummarySchema>;
export type TickerDetail = z.infer<typeof TickerDetailSchema>;
