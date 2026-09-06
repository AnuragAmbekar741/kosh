import { client } from "@/api/client"
import type { HealthResponse } from "@/api/health/health.types"

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return client.get<HealthResponse>("/health", { signal }).then((res) => res.data)
}