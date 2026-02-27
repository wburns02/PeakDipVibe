import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import { TickerDetailSchema, TickerSummarySchema } from "../types/ticker";
import { z } from "zod";

export function useTickerList(search?: string, sector?: string) {
  return useQuery({
    queryKey: ["tickers", search, sector],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (sector) params.sector = sector;
      const { data } = await api.get("/tickers", { params });
      return z.array(TickerSummarySchema).parse(data);
    },
  });
}

export function useTicker(symbol: string) {
  return useQuery({
    queryKey: ["ticker", symbol],
    queryFn: async () => {
      const { data } = await api.get(`/tickers/${symbol}`);
      return TickerDetailSchema.parse(data);
    },
    enabled: !!symbol,
  });
}
