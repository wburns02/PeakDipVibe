import { useQuery } from "@tanstack/react-query";
import { api } from "../client";

interface Future {
  symbol: string;
  name: string;
  price: number;
  prev_close: number;
  change_pct: number;
}

interface Mover {
  ticker: string;
  name: string;
  sector: string;
  change_pct: number;
  close: number;
}

interface WatchStock {
  ticker: string;
  name: string;
  sector: string;
  rsi: number;
  close: number;
  change_pct: number;
}

interface YesterdayBreadth {
  advancers: number;
  decliners: number;
  total_stocks: number;
  advance_decline_ratio: number;
  avg_rsi: number | null;
  pct_above_sma50: number;
  pct_above_sma200: number;
}

export interface PremarketData {
  futures: Future[];
  yesterday: {
    date: string | null;
    breadth: YesterdayBreadth | null;
    gainers: Mover[];
    losers: Mover[];
  };
  watch: {
    oversold: WatchStock[];
    overbought: WatchStock[];
  };
}

export function usePremarket() {
  return useQuery({
    queryKey: ["premarket"],
    queryFn: async () => {
      const { data } = await api.get<PremarketData>("/premarket");
      return data;
    },
    refetchInterval: 60_000, // Refresh every 60s for live futures
    staleTime: 30_000,
  });
}
