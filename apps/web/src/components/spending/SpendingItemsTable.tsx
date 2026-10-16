import type { SpendItem } from "@/api/spend-items/spend-items.types"
import { CategoryBadge } from "@/components/spending/CategoryBadge"
import { ItemBadge } from "@/components/spending/ItemBadge"
import {
  formatDate,
  formatMoney,
  formatShortDate,
} from "@/components/spending/spending-formatters"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type SpendingItemsTableProps = {
  items: SpendItem[]
  page: number
  pageSize: number
}

function itemName(item: SpendItem) {
  return item.description || item.merchant
}

type ItemListRowProps = {
  item: SpendItem
}

/** The product badge earns phone space only when it asks for a pick. */
function needsItemPick(item: SpendItem) {
  return item.item_status === "needs_review" || item.item_status === "failed"
}

/**
 * Phones: two aligned lines per item. Name and amount on top; merchant, date
 * and category below, with the category under the amount.
 */
function ItemListRow({ item }: ItemListRowProps) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 not-first:border-t">
      <span className="truncate text-sm font-medium">{itemName(item)}</span>
      <span className="text-right text-sm font-medium tabular-nums">
        {formatMoney(item.amount, item.currency)}
      </span>
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <span className="truncate">{item.merchant}</span>
        <span aria-hidden>·</span>
        <span className="shrink-0 tabular-nums">
          {formatShortDate(item.spent_at)}
        </span>
        {needsItemPick(item) ? <ItemBadge item={item} /> : null}
      </span>
      <span className="flex justify-end">
        {item.category ? <CategoryBadge category={item.category} /> : null}
      </span>
    </li>
  )
}

export function SpendingItemsTable({
  items,
  page,
  pageSize,
}: SpendingItemsTableProps) {
  const offset = (page - 1) * pageSize

  return (
    <>
      <ul className="no-scrollbar min-h-0 shrink scroll-fade-y overflow-auto rounded-xl border md:hidden">
        {items.map((item) => (
          <ItemListRow item={item} key={item.id} />
        ))}
      </ul>
      <div className="no-scrollbar min-h-0 shrink scroll-fade-y overflow-auto rounded-xl border max-md:hidden [&>[data-slot=table-container]]:overflow-visible">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-12 text-right">#</TableHead>
              <TableHead aria-sort="descending">Date</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                  {offset + index + 1}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(item.spent_at)}
                </TableCell>
                <TableCell className="max-w-48 truncate font-medium">
                  {itemName(item)}
                </TableCell>
                <TableCell>
                  {item.item_status === "none" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <ItemBadge item={item} />
                  )}
                </TableCell>
                <TableCell className="max-w-40 truncate">
                  {item.merchant}
                </TableCell>
                <TableCell>
                  {item.category ? (
                    <CategoryBadge category={item.category} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.source === "manual" ? "Manual entry" : "Document"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(item.amount, item.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
