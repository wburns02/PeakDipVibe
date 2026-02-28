import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import {
  PatternSignalSchema,
  SignalStatsSchema,
  type SignalFilters,
} from "../types/signals";
import { z } from "zod";

export function usePatternSignals(filters: SignalFilters) {
  return useQuery({
    queryKey: ["signals", "patterns", filters],
    queryFn: async () => {
      const params: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== null && v !== "") {
          params[k] = v;
        }
      }
      const { data } = await api.get("/signals/patterns", { params });
      return z.array(PatternSignalSchema).parse(data);
    },
    staleTime: 60 * 1000,
  });
}

export function useSignalStats(days: number = 30) {
  return useQuery({
    queryKey: ["signals", "stats", days],
    queryFn: async () => {
      const { data } = await api.get("/signals/patterns/stats", {
        params: { days },
      });
      return SignalStatsSchema.parse(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTickerSignals(ticker: string) {
  return useQuery({
    queryKey: ["signals", "ticker", ticker],
    queryFn: async () => {
      const { data } = await api.get(`/signals/patterns/${ticker}`);
      return z.array(PatternSignalSchema).parse(data);
    },
    enabled: !!ticker,
    staleTime: 60 * 1000,
  });
}
