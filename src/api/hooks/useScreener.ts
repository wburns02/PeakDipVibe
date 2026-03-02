import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import { STALE_FRESH } from "../queryConfig";
import { ScreenerResultSchema, type ScreenerFilters } from "../types/screener";
import { z } from "zod";

export function useScreener(filters: ScreenerFilters) {
  return useQuery({
    queryKey: ["screener", filters],
    queryFn: async () => {
      // Strip undefined values
      const params: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== null && v !== "") {
          params[k] = v;
        }
      }
      const { data } = await api.get("/screener", { params });
      return z.array(ScreenerResultSchema).parse(data);
    },
    staleTime: STALE_FRESH,
  });
}
