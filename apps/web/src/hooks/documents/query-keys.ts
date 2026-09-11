export const documentQueryKeys = {
  all: ["documents"] as const,
  detail: (id: string) => ["documents", id] as const,
}
