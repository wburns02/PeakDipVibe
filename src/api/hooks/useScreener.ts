import { useQuery } from "@tanstack/react-query";
import { api } from "../client";
import { STALE_FRESH } from "../queryConfig";
import { ScreenerResultSchema, type ScreenerFilters } from "../types/screener";
import { z } from "zod";
import { stripEmptyParams } from "@/lib/params";
import { normalizeSector } from "@/lib/formatters";

export function useScreener(filters: ScreenerFilters) {
  return useQuery({
    queryKey: ["screener", filters],
    queryFn: async () => {
      const params = stripEmptyParams(filters);
      const { data } = await api.get("/screener", { params });
      const results = z.array(ScreenerResultSchema).parse(data);
      return results.map((r) => ({ ...r, sector: r.sector ? normalizeSector(r.sector) : r.sector }));
    },
    staleTime: STALE_FRESH,
  });
}
