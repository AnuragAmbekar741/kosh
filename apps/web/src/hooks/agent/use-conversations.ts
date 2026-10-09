import { useQuery } from "@tanstack/react-query"

import { getConversations } from "@/api/agent/agent"
import { agentQueryKeys } from "@/hooks/agent/query-keys"

export function useConversations(enabled: boolean) {
  return useQuery({
    queryKey: agentQueryKeys.conversations,
    queryFn: ({ signal }) => getConversations(signal),
    enabled,
  })
}
