import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import { STALE_FRESH, STALE_WARM } from "../queryConfig";
import {
  CompareResponseSchema,
  SparklineResponseSchema,
  BacktestResponseSchema,
} from "../types/compare";

export function useCompare(tickers: string[], limit = 252) {
  return useQuery({
    queryKey: ["compare", tickers, limit],
    queryFn: async () => {
      const { data } = await api.get("/prices/compare", {
        params: { tickers: tickers.join(","), limit },
      });
      return CompareResponseSchema.parse(data);
    },
    enabled: tickers.length >= 2,
    staleTime: STALE_FRESH,
  });
}

export function useSparkline(ticker: string, days = 7) {
  return useQuery({
    queryKey: ["sparkline", ticker, days],
    queryFn: async () => {
      const { data } = await api.get(`/prices/${ticker}/sparkline`, {
        params: { days },
      });
      return SparklineResponseSchema.parse(data);
    },
    enabled: !!ticker,
    staleTime: STALE_WARM,
  });
}

export function useBacktest(
  ticker: string,
  opts?: {
    indicator?: string;
    threshold?: number;
    direction?: string;
    hold_days?: number;
  }
) {
  return useQuery({
    queryKey: ["backtest", ticker, opts],
    queryFn: async () => {
      const { data } = await api.get(`/signals/${ticker}/backtest`, {
        params: opts,
      });
      return BacktestResponseSchema.parse(data);
    },
    enabled: !!ticker,
    staleTime: STALE_WARM,
  });
}
