import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import {
  MarketOverviewSchema,
  SectorPerformanceSchema,
  StatusResponseSchema,
} from "../types/market";
import { z } from "zod";

export function useMarketOverview() {
  return useQuery({
    queryKey: ["market-overview"],
    queryFn: async () => {
      const { data } = await api.get("/market/overview");
      return MarketOverviewSchema.parse(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSectors() {
  return useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const { data } = await api.get("/market/sectors");
      return z.array(SectorPerformanceSchema).parse(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePipelineStatus() {
  return useQuery({
    queryKey: ["pipeline-status"],
    queryFn: async () => {
      const { data } = await api.get("/status");
      return StatusResponseSchema.parse(data);
    },
    staleTime: 60 * 1000,
  });
}
