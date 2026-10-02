import type { Category } from "@/api/spend-items/spend-items.types"

export type CatalogEntry = {
  id: string
  name: string
  family: string | null
  category: Category | null
  is_family: boolean
  mine: boolean
}
