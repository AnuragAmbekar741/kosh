import { ChevronRightIcon } from "lucide-react"

import type { SpendAnalytics } from "@/api/spend-items/spend-items.types"
import {
  formatDate,
  formatMoney,
} from "@/components/spending/spending-formatters"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type RankedRowProps = {
  title: string
  detail: string
  amount: string
  /** 0–1 share of the largest row; draws the bar under the title. */
  ratio: number
  onOpen: () => void
}

function RankedRow({ title, detail, amount, ratio, onOpen }: RankedRowProps) {
  return (
    <li>
      <button
        className="group grid w-full cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-x-2 gap-y-1.5 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
        onClick={onOpen}
        type="button"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {detail}
          </span>
        </span>
        <span className="tabular-nums">{amount}</span>
        <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        <span className="col-span-3 h-1 overflow-hidden rounded-full bg-muted group-hover:bg-background">
          <span
            className="block h-full rounded-full bg-primary/70"
            style={{ width: `${Math.max(ratio * 100, 2)}%` }}
          />
        </span>
      </button>
    </li>
  )
}

type TopListProps = {
  data: SpendAnalytics
  onOpenMerchant: (merchant: string) => void
}

export function TopMerchants({ data, onOpenMerchant }: TopListProps) {
  const max = Number(data.merchants[0]?.total ?? 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top merchants</CardTitle>
        <CardDescription>Where your money goes</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="-mx-2 flex flex-col">
          {data.merchants.map((row) => (
            <RankedRow
              amount={formatMoney(row.total, data.currency)}
              detail={`${row.bill_count} bill${row.bill_count === 1 ? "" : "s"}`}
              key={row.merchant}
              onOpen={() => onOpenMerchant(row.merchant)}
              ratio={max ? Number(row.total) / max : 0}
              title={row.merchant}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function LargestBills({ data, onOpenMerchant }: TopListProps) {
  const max = Number(data.largest_bills[0]?.total ?? 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Largest bills</CardTitle>
        <CardDescription>Your biggest single spends</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="-mx-2 flex flex-col">
          {data.largest_bills.map((bill, index) => (
            <RankedRow
              amount={formatMoney(bill.total, data.currency)}
              detail={`${formatDate(bill.spent_at)} · ${bill.item_count} item${bill.item_count === 1 ? "" : "s"}`}
              key={bill.document_id ?? `${bill.merchant}-${index}`}
              onOpen={() => onOpenMerchant(bill.merchant)}
              ratio={max ? Number(bill.total) / max : 0}
              title={bill.merchant}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
