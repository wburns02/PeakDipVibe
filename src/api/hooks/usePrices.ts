import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import { ChartRowSchema, PriceRowSchema, SeasonalResponseSchema } from "../types/price";
import { z } from "zod";

export function usePriceHistory(
  ticker: string,
  opts?: { start?: string; end?: string; limit?: number }
) {
  return useQuery({
    queryKey: ["prices", ticker, opts],
    queryFn: async () => {
      const { data } = await api.get(`/prices/${ticker}`, { params: opts });
      return z.array(PriceRowSchema).parse(data);
    },
    enabled: !!ticker,
  });
}

export function useSeasonalTrends(ticker: string) {
  return useQuery({
    queryKey: ["seasonal", ticker],
    queryFn: async () => {
      const { data } = await api.get(`/prices/${ticker}/seasonal`);
      return SeasonalResponseSchema.parse(data);
    },
    enabled: !!ticker,
  });
}

export function useChartData(
  ticker: string,
  opts?: { start?: string; end?: string; limit?: number }
) {
  return useQuery({
    queryKey: ["chart", ticker, opts],
    queryFn: async () => {
      const { data } = await api.get(`/prices/${ticker}/chart`, {
        params: opts,
      });
      return z.array(ChartRowSchema).parse(data);
    },
    enabled: !!ticker,
  });
}
