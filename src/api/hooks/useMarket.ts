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
import type { SectorPerformance } from "../types/market";
import { z } from "zod";
import { normalizeSector } from "@/lib/formatters";

export function useMarketOverview() {
  return useQuery({
    queryKey: ["market-overview"],
    queryFn: async () => {
      const { data } = await api.get("/market/overview");
      const overview = MarketOverviewSchema.parse(data);
      // Normalize sector names and merge duplicates in sector list
      overview.sectors = mergeSectors(overview.sectors);
      for (const m of [...overview.top_gainers, ...overview.top_losers]) {
        m.sector = m.sector ? normalizeSector(m.sector) : m.sector;
      }
      return overview;
    },
    staleTime: STALE_WARM,
  });
}

/** Merge duplicate sector names into canonical GICS sectors. */
function mergeSectors(raw: SectorPerformance[]): SectorPerformance[] {
  const map = new Map<string, SectorPerformance>();
  for (const s of raw) {
    const name = normalizeSector(s.sector);
    const existing = map.get(name);
    if (existing) {
      const total = existing.ticker_count + s.ticker_count;
      existing.avg_change_pct =
        (existing.avg_change_pct * existing.ticker_count + s.avg_change_pct * s.ticker_count) / total;
      existing.ticker_count = total;
    } else {
      map.set(name, { ...s, sector: name });
    }
  }
  return [...map.values()].sort((a, b) => a.sector.localeCompare(b.sector));
}

export function useSectors() {
  return useQuery({
    queryKey: ["sectors"],
    queryFn: async () => {
      const { data } = await api.get("/market/sectors");
      const raw = z.array(SectorPerformanceSchema).parse(data);
      return mergeSectors(raw);
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
