export const agentQueryKeys = {
  conversations: ["agent", "conversations"] as const,
  conversation: (id: string) => ["agent", "conversations", id] as const,
}
