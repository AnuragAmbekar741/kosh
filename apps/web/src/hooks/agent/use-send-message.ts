import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { createConversation, streamMessage } from "@/api/agent/agent"
import { sendErrorMessage } from "@/components/agent/agent-copy"
import { agentQueryKeys } from "@/hooks/agent/query-keys"

/** The turn being sent: shown until the saved transcript replaces it. */
export type PendingTurn = {
  text: string
  tool: string | null
  reply: string | null
  error: string | null
  streaming: boolean
}

type Options = {
  conversationId: string | null
  onConversation: (id: string) => void
}

export function useSendMessage({ conversationId, onConversation }: Options) {
  const queryClient = useQueryClient()
  const [turn, setTurn] = useState<PendingTurn | null>(null)

  async function send(text: string) {
    if (turn?.streaming) return
    setTurn({ text, tool: null, reply: null, error: null, streaming: true })
    try {
      let id = conversationId
      if (!id) {
        id = (await createConversation()).id
        onConversation(id)
      }
      await streamMessage(id, text, (event) => {
        if (event.type === "tool") {
          setTurn((t) => t && { ...t, tool: event.name })
        } else if (event.type === "delta") {
          setTurn((t) => t && { ...t, reply: (t.reply ?? "") + event.text })
        }
      })
      // A failed reply is saved too: the transcript marks it and offers Retry.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: agentQueryKeys.conversation(id),
        }),
        queryClient.invalidateQueries({
          queryKey: agentQueryKeys.conversations,
          exact: true,
        }),
      ])
      setTurn(null)
    } catch (error) {
      setTurn(
        (t) => t && { ...t, streaming: false, error: sendErrorMessage(error) }
      )
    }
  }

  return { turn, send, clear: () => setTurn(null) }
}
