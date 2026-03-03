import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import { STALE_FRESH, STALE_WARM } from "../queryConfig";
import {
  MarketBreadthSchema,
  MarketOverviewSchema,
  SectorPerformanceSchema,
  StatusResponseSchema,
  UpcomingEarningsResponseSchema,
} from "../types/market";
import { z } from "zod";

export function useMarketOverview() {
  return useQuery({
    queryKey: ["market-overview"],
    queryFn: async () => {
      const { data } = await api.get("/market/overview");
      return MarketOverviewSchema.parse(data);
    },
    staleTime: STALE_WARM,
  });
}

export function useSectors() {
  return useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const { data } = await api.get("/market/sectors");
      return z.array(SectorPerformanceSchema).parse(data);
    },
    staleTime: STALE_WARM,
  });
}

export function useMarketBreadth() {
  return useQuery({
    queryKey: ["market-breadth"],
    queryFn: async () => {
      const { data } = await api.get("/market/breadth");
      return MarketBreadthSchema.parse(data);
    },
    staleTime: STALE_WARM,
  });
}

export function useUpcomingEarnings(limit = 8) {
  return useQuery({
    queryKey: ["upcoming-earnings", limit],
    queryFn: async () => {
      const { data } = await api.get("/market/upcoming-earnings", {
        params: { limit },
      });
      return UpcomingEarningsResponseSchema.parse(data);
    },
    staleTime: STALE_WARM,
  });
}

export function usePipelineStatus() {
  return useQuery({
    queryKey: ["pipeline-status"],
    queryFn: async () => {
      const { data } = await api.get("/status");
      return StatusResponseSchema.parse(data);
    },
    staleTime: STALE_FRESH,
  });
}
