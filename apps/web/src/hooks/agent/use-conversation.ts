import { useQuery } from "@tanstack/react-query"

import { getConversation } from "@/api/agent/agent"
import type { ConversationDetail } from "@/api/agent/agent.types"
import { agentQueryKeys } from "@/hooks/agent/query-keys"

export function useConversation(conversationId: string | null) {
  return useQuery<ConversationDetail>({
    queryKey: agentQueryKeys.conversation(conversationId ?? ""),
    queryFn: ({ signal }) => getConversation(conversationId!, signal),
    enabled: Boolean(conversationId),
  })
}
