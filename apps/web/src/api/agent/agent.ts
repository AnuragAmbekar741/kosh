import type { AccessTokenResponse } from "@/api/auth/auth.types"
import { client, getAccessToken, setAccessToken } from "@/api/client"
import type { Paginated } from "@/api/spend-items/spend-items.types"
import {
  AgentRequestError,
  type AgentEvent,
  type ConversationDetail,
  type ConversationPublic,
} from "@/api/agent/agent.types"

export async function createConversation(): Promise<ConversationPublic> {
  const { data } = await client.post<ConversationPublic>("/agent/conversations")
  return data
}

export async function getConversations(
  signal?: AbortSignal
): Promise<Paginated<ConversationPublic>> {
  const { data } = await client.get<Paginated<ConversationPublic>>(
    "/agent/conversations",
    { params: { limit: 30 }, signal }
  )
  return data
}

export async function getConversation(
  id: string,
  signal?: AbortSignal
): Promise<ConversationDetail> {
  const { data } = await client.get<ConversationDetail>(
    `/agent/conversations/${id}`,
    { signal }
  )
  return data
}

/**
 * Send a message and read the streamed reply, calling `onEvent` per event.
 *
 * Uses fetch because EventSource cannot send the Authorization header. A 401
 * refreshes the access token once and retries, like the axios client. Throws
 * AgentRequestError when the server refuses before streaming.
 */
export async function streamMessage(
  conversationId: string,
  text: string,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const send = (token: string | null) =>
    fetch(
      `${client.defaults.baseURL ?? ""}/agent/conversations/${conversationId}/messages`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text }),
        signal,
      }
    )

  let response = await send(getAccessToken())
  if (response.status === 401) {
    const { data } = await client.post<AccessTokenResponse>("/auth/refresh")
    setAccessToken(data.access_token)
    response = await send(data.access_token)
  }
  if (!response.ok || !response.body) {
    const body: unknown = await response.json().catch(() => undefined)
    const detail =
      body && typeof body === "object" && "detail" in body
        ? String(body.detail)
        : undefined
    throw new AgentRequestError(response.status, detail)
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ""
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    let end = buffer.indexOf("\n\n")
    while (end !== -1) {
      const event = parseEvent(buffer.slice(0, end))
      if (event) onEvent(event)
      buffer = buffer.slice(end + 2)
      end = buffer.indexOf("\n\n")
    }
  }
}

function parseEvent(block: string): AgentEvent | null {
  let type = ""
  let data = ""
  for (const line of block.split("\n")) {
    if (line.startsWith("event: ")) type = line.slice(7)
    else if (line.startsWith("data: ")) data += line.slice(6)
  }
  if (!type || !data) return null
  try {
    return { type, ...JSON.parse(data) } as AgentEvent
  } catch {
    return null
  }
}
