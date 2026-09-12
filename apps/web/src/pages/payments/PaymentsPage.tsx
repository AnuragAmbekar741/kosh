import { motion } from "framer-motion"
import { FileText, Plus, ReceiptText } from "lucide-react"
import { Link } from "react-router"

import type { SpendItem } from "@/api/spend-items/spend-items.types"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { useDocuments } from "@/hooks/documents/use-documents"
import { useSpendItems } from "@/hooks/spend-items/use-spend-items"

function money(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount)
}

function date(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value.includes("T") ? value : `${value}T00:00:00`))
}

function total(items: SpendItem[]) {
  return items.reduce((sum, item) => sum + Number(item.amount), 0)
}

export function PaymentsPage() {
  const documents = useDocuments()
  const spendItems = useSpendItems()
  const documentById = new Map(documents.data?.map((item) => [item.id, item]))
  const grouped = new Map<string, SpendItem[]>()

  for (const item of spendItems.data ?? []) {
    const key = item.document_id ?? "manual"
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }

  const groups = Array.from(grouped.entries()).sort(([, left], [, right]) =>
    right[0].spent_at.localeCompare(left[0].spent_at)
  )
  const isPending = documents.isPending || spendItems.isPending
  const isError = documents.isError || spendItems.isError

  return (
    <motion.main
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col py-10 sm:py-14"
      initial={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl leading-tight font-light sm:text-4xl">
            Payments
          </h1>
          <p className="mt-2 text-sm font-light text-muted-foreground">
            A quiet record of every document you’ve confirmed.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link to="/" />}
          size="sm"
          variant="outline"
        >
          <Plus /> Add document
        </Button>
      </div>

      {isPending ? (
        <div
          className="space-y-3"
          aria-label="Loading payments"
          aria-live="polite"
        >
          {[0, 1, 2].map((item) => (
            <div className="h-20 animate-pulse rounded-lg bg-card" key={item} />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive">
          Payments could not be loaded. Please refresh and try again.
        </div>
      ) : groups.length === 0 ? (
        <section className="flex flex-1 flex-col items-center justify-center py-24 text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-brand-ink">
            <ReceiptText className="size-5" strokeWidth={1.5} />
          </span>
          <h2 className="text-xl font-normal">
            Your payments will gather here
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Upload a receipt or statement, review the extraction, and save it
            when it looks right.
          </p>
          <Button
            className="mt-6"
            nativeButton={false}
            render={<Link to="/" />}
          >
            Upload your first document
          </Button>
        </section>
      ) : (
        <section>
          <Accordion className="gap-2.5">
            {groups.map(([documentId, items]) => {
              const document = documentById.get(documentId)
              const currency = items[0].currency
              return (
                <AccordionItem
                  className="overflow-hidden rounded-xl border border-border/80 bg-card/70 px-3 transition-colors sm:px-4 data-open:bg-card"
                  key={documentId}
                  value={documentId}
                >
                  <AccordionTrigger className="items-start gap-3 py-3.5 hover:no-underline [&_[data-slot=accordion-trigger-icon]]:hidden">
                    <span className="flex min-w-0 items-center gap-3 text-left">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-brand-ink">
                        <FileText className="size-4" strokeWidth={1.5} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {items[0].merchant || document?.filename || "Payment"}
                        </span>
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                          {date(items[0].spent_at)}
                          {document
                            ? ` · ${items.length} ${items.length === 1 ? "entry" : "entries"}`
                            : " · Manual entry"}
                        </span>
                      </span>
                    </span>
                    <span className="ml-auto shrink-0 text-sm font-medium tabular-nums sm:text-base">
                      {money(total(items), currency)}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3.5">
                    <div className="max-h-72 overflow-y-auto overscroll-contain border-t border-border/80 pl-11">
                      {items.map((item) => (
                        <div
                          className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0"
                          key={item.id}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-foreground">
                              {item.description || item.merchant}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {item.category || "Uncategorized"}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm text-foreground tabular-nums">
                            {money(Number(item.amount), item.currency)}
                          </p>
                        </div>
                      ))}
                    </div>
                    {document ? (
                      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 pl-11 text-xs text-muted-foreground">
                        <p className="truncate">Source · {document.filename}</p>
                        <p>Extracted {date(document.created_at)}</p>
                      </div>
                    ) : null}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </section>
      )}
    </motion.main>
  )
}
