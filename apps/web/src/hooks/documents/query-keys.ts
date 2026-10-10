export const documentQueryKeys = {
  all: ["documents"] as const,
  inbox: ["documents", "inbox"] as const,
  detail: (id: string) => ["documents", id] as const,
}
