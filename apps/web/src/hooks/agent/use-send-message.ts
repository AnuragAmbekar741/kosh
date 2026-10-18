import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"

import { createConversation, streamMessage } from "@/api/agent/agent"
import type { AgentEvent, BillAction } from "@/api/agent/agent.types"
import type { DocumentStatus } from "@/api/documents/documents.types"
import { sendErrorMessage } from "@/components/agent/agent-copy"
import { agentQueryKeys } from "@/hooks/agent/query-keys"
import { randomId } from "@/lib/utils"

/** The turn being sent: shown until the saved transcript replaces it. */
export type PendingTurn = {
  /** New per send: the scroller remembers positions by id, so never reuse one. */
  id: string
  text: string
  documentIds: string[]
  /** Attached bills while the reply waits for them to be read. */
  documents: Record<string, DocumentStatus>
  tool: string | null
  actions: BillAction[]
  reply: string | null
  error: string | null
  streaming: boolean
}

function toAction(event: Extract<AgentEvent, { type: "action" }>): BillAction {
  return {
    tool: event.tool,
    kind: event.kind,
    document_id: event.document_id,
    merchant: event.merchant,
    spent_at: event.spent_at,
    line_count: event.line_count,
    totals: event.totals,
    possible_duplicates: event.possible_duplicates,
  }
}

type Options = {
  conversationId: string | null
  onConversation: (id: string) => void
}

export function useSendMessage({ conversationId, onConversation }: Options) {
  const queryClient = useQueryClient()
  const [turn, setTurn] = useState<PendingTurn | null>(null)
  // Refs, not state: a queued send runs from an older render's closure.
  const streaming = useRef(false)
  const queue = useRef<Array<[string, string[]]>>([])
  const currentId = useRef(conversationId)
  useEffect(() => {
    currentId.current = conversationId
  }, [conversationId])

  /** Sends now, or right after the reply that is streaming (scanned bills). */
  async function send(text: string, documentIds: string[] = []) {
    if (streaming.current) {
      queue.current.push([text, documentIds])
      return
    }
    streaming.current = true
    setTurn({
      id: randomId(),
      text,
      documentIds,
      documents: {},
      tool: null,
      actions: [],
      reply: null,
      error: null,
      streaming: true,
    })
    try {
      let id = currentId.current
      if (!id) {
        id = (await createConversation()).id
        currentId.current = id
        onConversation(id)
      }
      await streamMessage(id, { text, documentIds }, (event) => {
        if (event.type === "document") {
          setTurn(
            (t) =>
              t && {
                ...t,
                documents: { ...t.documents, [event.id]: event.status },
              }
          )
        } else if (event.type === "tool") {
          setTurn((t) => t && { ...t, tool: event.name })
        } else if (event.type === "action") {
          const action = toAction(event)
          setTurn((t) => t && { ...t, actions: [...t.actions, action] })
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
    } finally {
      streaming.current = false
      const next = queue.current.shift()
      if (next) void send(...next)
    }
  }

  return { turn, send, clear: () => setTurn(null) }
}
