import { useEffect, useState } from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { FilterMenu } from "@/components/spending/FilterMenu"
import { Badge } from "@/components/ui/badge"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { useSpendFilters } from "@/hooks/spend-items/use-spend-filters"
import { cn } from "@/lib/utils"

type SpendingToolbarProps = {
  /** e.g. "24 bills"; hidden when there is nothing to count. */
  countLabel?: string | null
  disabled?: boolean
}

export function SpendingToolbar({
  countLabel,
  disabled = false,
}: SpendingToolbarProps) {
  const filters = useSpendFilters()
  const { setQ } = filters
  const urlQ = filters.q ?? ""
  const [draftQ, setDraftQ] = useState(urlQ)
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ)
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ)
    setDraftQ(urlQ)
  }

  useEffect(() => {
    const next = draftQ.trim()
    if (next === urlQ) return
    const timeout = window.setTimeout(() => {
      setQ(next || null)
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [draftQ, setQ, urlQ])

  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-2",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <FilterMenu />
      {countLabel ? (
        <Badge className="tabular-nums" variant="secondary">
          {countLabel}
        </Badge>
      ) : null}
      <Field className="ml-auto w-full min-w-0 gap-1 sm:w-64">
        <FieldLabel className="sr-only" htmlFor="spend-search">
          Search merchants or items
        </FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            id="spend-search"
            onChange={(event) => setDraftQ(event.target.value)}
            placeholder="Search merchants or items"
            value={draftQ}
          />
          {draftQ ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Clear search"
                onClick={() => setDraftQ("")}
                size="icon-xs"
              >
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </Field>
    </div>
  )
}
