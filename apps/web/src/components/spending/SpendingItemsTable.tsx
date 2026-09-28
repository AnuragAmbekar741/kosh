import type { SpendItem } from "@/api/spend-items/spend-items.types"
import { CategoryBadge } from "@/components/spending/CategoryBadge"
import { formatDate, formatMoney } from "@/components/spending/spending-formatters"
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
}

function itemName(item: SpendItem) {
  return item.description || item.merchant
}

export function SpendingItemsTable({ items }: SpendingItemsTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead aria-sort="descending">Date</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Merchant</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-muted-foreground">
                {formatDate(item.spent_at)}
              </TableCell>
              <TableCell className="max-w-48 truncate font-medium">
                {itemName(item)}
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
  )
}
