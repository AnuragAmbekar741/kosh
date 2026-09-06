import { useQuery } from "@tanstack/react-query"

import { getHealth } from "@/api/health/health"
import type { HealthResponse } from "@/api/health/health.types"
import { healthQueryKeys } from "@/hooks/health/query-keys"

export function useGetHealth(enabled = true) {
  return useQuery<HealthResponse>({
    queryKey: healthQueryKeys.health,
    queryFn: ({ signal }) => getHealth(signal),
    enabled,
  })
}