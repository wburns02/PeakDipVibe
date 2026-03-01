import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import {
  ImpactSummarySchema,
  PriceJourneySchema,
  ThisWeekSchema,
  SectorBreakdownSchema,
} from "../types/earnings";

export function useImpactSummary() {
  return useQuery({
    queryKey: ["earnings", "impact-summary"],
    queryFn: async () => {
      const { data } = await api.get("/earnings/impact-summary");
      return ImpactSummarySchema.parse(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePriceJourney(moveSize: string) {
  return useQuery({
    queryKey: ["earnings", "price-journey", moveSize],
    queryFn: async () => {
      const { data } = await api.get("/earnings/price-journey", {
        params: { move_size: moveSize },
      });
      return PriceJourneySchema.parse(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useThisWeek() {
  return useQuery({
    queryKey: ["earnings", "this-week"],
    queryFn: async () => {
      const { data } = await api.get("/earnings/this-week");
      return ThisWeekSchema.parse(data);
    },
    staleTime: 60 * 1000,
  });
}

export function useSectorBreakdown(days: number = 365) {
  return useQuery({
    queryKey: ["earnings", "sectors", days],
    queryFn: async () => {
      const { data } = await api.get("/earnings/sector-breakdown", {
        params: { days },
      });
      return SectorBreakdownSchema.parse(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}
