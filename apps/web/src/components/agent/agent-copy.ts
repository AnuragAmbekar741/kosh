import { AgentRequestError } from "@/api/agent/agent.types"

/** What the user sees while a tool runs; never the tool's own name. */
const TOOL_LABELS: Record<string, string> = {
  get_spending_summary: "Adding up your spending",
  list_spend_items: "Looking through your purchases",
  get_spend_item: "Opening that purchase",
  list_documents: "Checking your bills",
  get_document: "Opening that bill",
}

export function toolLabel(name: string | null): string {
  return (name && TOOL_LABELS[name]) ?? "Thinking"
}

const REFUSALS: Record<number, string> = {
  404: "That conversation isn't available. Start a new chat.",
  409: "Still answering your last message. Try again in a moment.",
  429: "You've reached today's message limit. It resets at midnight UTC.",
  503: "The assistant isn't set up on this server yet.",
}

export function sendErrorMessage(error: unknown): string {
  if (error instanceof AgentRequestError) {
    return REFUSALS[error.status] ?? "Couldn't send that. Try again."
  }
  return "Couldn't reach Kosh. Check your connection and try again."
}

export const FAILED_REPLY = "Couldn't answer this one."

export const SUGGESTIONS = [
  "How much did I spend last month?",
  "Where did most of my money go this year?",
  "Do I have any bills waiting for review?",
]
