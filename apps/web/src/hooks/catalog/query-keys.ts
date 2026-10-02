export const catalogQueryKeys = {
  all: ["catalog"] as const,
  search: (q: string) => ["catalog", "search", q] as const,
}
