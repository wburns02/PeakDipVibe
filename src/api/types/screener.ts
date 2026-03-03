import { z } from "zod";

export const ScreenerResultSchema = z.object({
  ticker: z.string(),
  name: z.string().nullable(),
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  market_cap: z.number().nullable(),
  close: z.number().nullable(),
  prev_close: z.number().nullable(),
  change_pct: z.number().nullable(),
  rsi_14: z.number().nullable(),
  sma_50: z.number().nullable(),
  sma_200: z.number().nullable(),
  bb_pctb: z.number().nullable(),
  above_sma50: z.boolean().nullable(),
  above_sma200: z.boolean().nullable(),
});

export type ScreenerResult = z.infer<typeof ScreenerResultSchema>;

export interface ScreenerFilters {
  rsi_min?: number;
  rsi_max?: number;
  price_min?: number;
  price_max?: number;
  above_sma50?: boolean;
  above_sma200?: boolean;
  golden_cross?: boolean;
  death_cross?: boolean;
  sector?: string;
  sort_by?: string;
  sort_dir?: string;
  limit?: number;
}
