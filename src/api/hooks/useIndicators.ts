import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import {
  IndicatorHistoryRowSchema,
  IndicatorSnapshotSchema,
} from "../types/indicator";
import { z } from "zod";

export function useLatestIndicators(ticker: string) {
  return useQuery({
    queryKey: ["indicators", ticker],
    queryFn: async () => {
      const { data } = await api.get(`/indicators/${ticker}`);
      return IndicatorSnapshotSchema.parse(data);
    },
    enabled: !!ticker,
  });
}

export function useIndicatorHistory(
  ticker: string,
  indicator: string,
  opts?: { start?: string; end?: string; limit?: number }
) {
  return useQuery({
    queryKey: ["indicator-history", ticker, indicator, opts],
    queryFn: async () => {
      const { data } = await api.get(`/indicators/${ticker}/history`, {
        params: { indicator, ...opts },
      });
      return z.array(IndicatorHistoryRowSchema).parse(data);
    },
    enabled: !!ticker && !!indicator,
  });
}
