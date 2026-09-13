import { FileTextIcon } from "lucide-react"

import type { SpendItem } from "@/api/spend-items/spend-items.types"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

import { formatDate, formatMoney } from "./spending-formatters"

type SpendingAccordionProps = {
  items: SpendItem[]
}

type SpendingGroup = {
  id: string
  items: SpendItem[]
}

type SpendingLineRowProps = {
  item: SpendItem
  index: number
}

function sortLineItems(left: SpendItem, right: SpendItem) {
  const leftIndex = left.line_index ?? Number.MAX_SAFE_INTEGER
  const rightIndex = right.line_index ?? Number.MAX_SAFE_INTEGER
  if (leftIndex !== rightIndex) return leftIndex - rightIndex
  return left.spent_at.localeCompare(right.spent_at)
}

function groupSpendItems(items: SpendItem[]) {
  const groups = new Map<string, SpendingGroup>()

  for (const item of items) {
    const id = item.document_id ?? `manual-${item.id}`
    const group = groups.get(id)
    if (group) group.items.push(item)
    else groups.set(id, { id, items: [item] })
  }

  for (const group of groups.values()) {
    group.items.sort(sortLineItems)
  }

  return Array.from(groups.values()).sort((left, right) =>
    right.items[0].spent_at.localeCompare(left.items[0].spent_at)
  )
}

function SpendingLineRow({ item, index }: SpendingLineRowProps) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-3 pr-4 pl-16 not-first:border-t sm:pr-5 sm:pl-17">
      <span className="text-xs text-muted-foreground tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-normal">
          {item.description || item.merchant}
        </p>
        {item.category ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.category}</p>
        ) : null}
      </div>
      <p className="shrink-0 text-sm font-normal tabular-nums">
        {formatMoney(item.amount, item.currency)}
      </p>
    </div>
  )
}

export function SpendingAccordion({ items }: SpendingAccordionProps) {
  const groups = groupSpendItems(items)

  return (
    <Accordion className="overflow-hidden rounded-xl border">
      {groups.map((group) => {
        const first = group.items[0]
        const total = group.items.reduce(
          (sum, item) => sum + Number(item.amount),
          0
        )

        return (
          <AccordionItem key={group.id} value={group.id}>
            <AccordionTrigger className="cursor-pointer items-center rounded-none px-4 py-4 hover:bg-muted/50 hover:no-underline aria-expanded:hover:bg-transparent sm:px-5 sm:py-5 **:data-[slot=accordion-trigger-icon]:hidden">
              <span className="flex min-w-0 items-center gap-3 text-left">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted [&_svg]:size-4">
                  <FileTextIcon />
                </span>
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{first.merchant}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Badge variant="outline">{formatDate(first.spent_at)}</Badge>
                    <Badge variant="outline">
                      {first.document_id ? "Document" : "Manual entry"}
                    </Badge>
                    <Badge variant="outline">
                      {group.items.length}{" "}
                      {group.items.length === 1 ? "item" : "items"}
                    </Badge>
                  </span>
                </span>
              </span>
              <span className="ml-auto shrink-0 font-medium tabular-nums">
                {formatMoney(total, first.currency)}
              </span>
            </AccordionTrigger>
            <AccordionContent className="h-auto border-t pb-0 [&_p]:mb-0 [&_p:not(:last-child)]:mb-0">
              {group.items.map((item, index) => (
                <SpendingLineRow index={index} item={item} key={item.id} />
              ))}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
