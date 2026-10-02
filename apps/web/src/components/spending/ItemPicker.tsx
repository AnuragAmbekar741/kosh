import { useEffect, useState } from "react"
import { BanIcon, PlusIcon } from "lucide-react"

import type { CatalogEntry } from "@/api/catalog/catalog.types"
import { apiDetail } from "@/api/client"
import type {
  ItemCorrection,
  SpendItem,
} from "@/api/spend-items/spend-items.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { useCatalogSearch } from "@/hooks/catalog/use-catalog"
import { useCorrectSpendItemItem } from "@/hooks/spend-items/use-spend-items"

import { ItemBadge } from "./ItemBadge"

type ItemPickerProps = {
  line: SpendItem
}

export function ItemPicker({ line }: ItemPickerProps) {
  const [open, setOpen] = useState(false)
  if (line.item_status === "none") return null
  const label = line.description || line.merchant

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        aria-label={`Change product for ${label}`}
        render={
          <button
            className="w-fit shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
          />
        }
      >
        <ItemBadge item={line} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-2 p-2">
        {open ? (
          <ItemPickerBody line={line} onDone={() => setOpen(false)} />
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function ItemPickerBody({
  line,
  onDone,
}: {
  line: SpendItem
  onDone: () => void
}) {
  const [draft, setDraft] = useState("")
  const [term, setTerm] = useState("")
  const [newName, setNewName] = useState<string | null>(null)
  const search = useCatalogSearch(term)
  const correct = useCorrectSpendItemItem()
  const choosingFamily = newName !== null
  const entries = (search.data ?? []).filter(
    (entry) => !choosingFamily || entry.is_family
  )
  const typed = draft.trim()
  const exact = entries.some(
    (entry) => entry.name.toLowerCase() === typed.toLowerCase()
  )

  useEffect(() => {
    const timeout = window.setTimeout(() => setTerm(draft), 200)
    return () => window.clearTimeout(timeout)
  }, [draft])

  async function save(correction: ItemCorrection) {
    try {
      await correct.mutateAsync({ id: line.id, correction })
      onDone()
    } catch {
      // Mutation state renders the API error below the list.
    }
  }

  function pick(entry: CatalogEntry) {
    if (newName !== null) {
      void save({ new_item: { name: newName, family_id: entry.id } })
    } else {
      void save({ catalog_item_id: entry.id })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-xs text-muted-foreground">
        {choosingFamily
          ? `Which family does “${newName}” belong to?`
          : "Which product is this line?"}
      </p>
      <Input
        aria-label={choosingFamily ? "Search families" : "Search products"}
        autoFocus
        disabled={correct.isPending}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={choosingFamily ? "Search families" : "Search products"}
        value={draft}
      />
      <div className="flex max-h-56 flex-col overflow-y-auto">
        {search.isFetching && !entries.length ? (
          <Spinner className="mx-auto my-2" />
        ) : null}
        {entries.map((entry) => (
          <button
            className="flex items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-50"
            disabled={correct.isPending}
            key={entry.id}
            onClick={() => pick(entry)}
            type="button"
          >
            <span className="truncate">{entry.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {entry.family ?? entry.category}
            </span>
          </button>
        ))}
        {term.trim() && !search.isFetching && !entries.length ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            No matches
          </p>
        ) : null}
      </div>
      {apiDetail(correct.error) ? (
        <p className="px-1 text-xs text-destructive">
          {apiDetail(correct.error)}
        </p>
      ) : null}
      {choosingFamily ? (
        <Button
          onClick={() => {
            setNewName(null)
            setDraft("")
          }}
          size="sm"
          variant="ghost"
        >
          Back
        </Button>
      ) : (
        <div className="flex flex-col gap-1 border-t pt-2">
          {typed && !exact ? (
            <Button
              className="justify-start"
              disabled={correct.isPending}
              onClick={() => {
                setNewName(typed)
                setDraft("")
              }}
              size="sm"
              variant="ghost"
            >
              <PlusIcon data-icon="inline-start" />
              Create “{typed}”
            </Button>
          ) : null}
          <Button
            className="justify-start"
            disabled={correct.isPending}
            onClick={() => void save({ not_product: true })}
            size="sm"
            variant="ghost"
          >
            <BanIcon data-icon="inline-start" />
            Not a product
          </Button>
        </div>
      )}
    </div>
  )
}
