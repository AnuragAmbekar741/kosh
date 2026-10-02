import type { SpendItem } from "@/api/spend-items/spend-items.types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ItemBadgeProps = {
  item: Pick<SpendItem, "item" | "item_status">
}

function itemBadgeLabel({ item, item_status }: ItemBadgeProps["item"]) {
  if (item_status === "pending" || item_status === "processing") {
    return "Matching…"
  }
  if (item_status === "not_product") return "Not a product"
  if (item_status === "resolved" && item) return item.name
  return "Pick item"
}

export function ItemBadge({ item }: ItemBadgeProps) {
  if (item.item_status === "none") return null
  const needsPick =
    item.item_status === "needs_review" || item.item_status === "failed"
  return (
    <Badge
      className={cn(
        "max-w-40 shrink-0 truncate font-normal",
        needsPick ? "border-dashed text-foreground" : "text-muted-foreground"
      )}
      title={
        item.item?.family
          ? `${item.item.name} · ${item.item.family}`
          : undefined
      }
      variant="outline"
    >
      {itemBadgeLabel(item)}
    </Badge>
  )
}
