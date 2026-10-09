export type ConversationPublic = {
  id: string
  title: string | null
  channel: string
  created_at: string
  updated_at: string
}

/** How the reply to a user message went; null on assistant messages. */
export type MessageStatus = "running" | "completed" | "failed"

export type MessagePublic = {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
  status: MessageStatus | null
}

export type ConversationDetail = ConversationPublic & {
  messages: MessagePublic[]
}

/** One server-sent event from `POST /agent/conversations/{id}/messages`. */
export type AgentEvent =
  | { type: "tool"; name: string }
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
