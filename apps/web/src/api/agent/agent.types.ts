export type ConversationPublic = {
  id: string
  title: string | null
  channel: string
  created_at: string
  updated_at: string
}

import type { DocumentStatus } from "@/api/documents/documents.types"

/**
 * A bill the agent offered to save. Nothing is saved until the user confirms
 * it with `POST /documents/{document_id}/confirm`.
 */
export type BillAction = {
  tool: string
  kind: "review_document"
  document_id: string
  merchant: string
  spent_at: string
  line_count: number
  /** Total per currency, as decimal strings. */
  totals: Record<string, string>
  possible_duplicates: number
}

/** How the reply to a user message went; null on assistant messages. */
export type MessageStatus = "running" | "completed" | "failed"

export type MessagePublic = {
  id: string
  role: "user" | "assistant"
  content: string
  /** Bills attached to a user message. */
  document_ids: string[]
  /** On replies: cards for bills offered in that turn. */
  actions: BillAction[]
  created_at: string
  status: MessageStatus | null
}

export type ConversationDetail = ConversationPublic & {
  messages: MessagePublic[]
}

/** One server-sent event from `POST /agent/conversations/{id}/messages`. */
export type AgentEvent =
  | { type: "document"; id: string; status: DocumentStatus }
  | { type: "tool"; name: string }
  | ({ type: "action" } & BillAction)
  | { type: "delta"; text: string }
  | { type: "done"; message_id: string; run_id: string }
  | { type: "error"; message: string; run_id: string }

/** The send was refused before streaming (404, 409, 429, 503, …). */
export class AgentRequestError extends Error {
  readonly status: number

  constructor(status: number, detail: string | undefined) {
    super(detail ?? `Request failed with status ${status}`)
    this.name = "AgentRequestError"
    this.status = status
  }
}
