import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../client";
import { STALE_FRESH, STALE_WARM } from "../queryConfig";
import {
  PeakDipEventSchema,
  TrackerSummarySchema,
  TrackerStatsSchema,
  type TrackerFilters,
} from "../types/tracker";

function stripEmpty(obj: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v != null && v !== ""),
  );
}

export function useTrackerEvents(filters: TrackerFilters = {}) {
  return useQuery({
    queryKey: ["tracker", "events", filters],
    queryFn: async () => {
      const params = stripEmpty(filters as Record<string, unknown>);
      const { data } = await api.get("/tracker/events", { params });
      return z.array(PeakDipEventSchema).parse(data);
    },
    staleTime: STALE_FRESH,
  });
}

export function useTrackerSummary() {
  return useQuery({
    queryKey: ["tracker", "summary"],
    queryFn: async () => {
      const { data } = await api.get("/tracker/summary");
      return TrackerSummarySchema.parse(data);
    },
    staleTime: STALE_WARM,
  });
}

export function useTrackerStats(days = 365) {
  return useQuery({
    queryKey: ["tracker", "stats", days],
    queryFn: async () => {
      const { data } = await api.get("/tracker/stats", { params: { days } });
      return TrackerStatsSchema.parse(data);
    },
    staleTime: STALE_WARM,
  });
}
