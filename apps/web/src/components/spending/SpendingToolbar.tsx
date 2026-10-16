import { useEffect, useState } from "react"
import { SearchIcon, XIcon } from "lucide-react"

import {
  FilterChips,
  FilterMenu,
  PeriodSwitch,
} from "@/components/spending/FilterMenu"
import { Badge } from "@/components/ui/badge"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { useSpendFilters } from "@/hooks/spend-items/use-spend-filters"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

type SearchFieldProps = {
  className: string
  dense?: boolean
  value: string
  onChange: (value: string) => void
}

function SearchField({ className, dense, value, onChange }: SearchFieldProps) {
  return (
    <Field className={className}>
      <FieldLabel className="sr-only" htmlFor="spend-search">
        Search merchants or items
      </FieldLabel>
      <InputGroup size={dense ? "dense" : "default"}>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          id="spend-search"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search merchants or items"
          value={value}
        />
        {value ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="Clear search"
              onClick={() => onChange("")}
              size="icon-xs"
            >
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </Field>
  )
}

type SpendingToolbarProps = {
  /** e.g. "24 bills"; hidden when there is nothing to count. */
  countLabel?: string | null
  disabled?: boolean
  search?: boolean
}

export function SpendingToolbar({
  countLabel,
  disabled = false,
  search = true,
}: SpendingToolbarProps) {
  const isPhone = useIsMobile()
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

  if (isPhone) {
    // Phones: 36px search (or the period switch) and a Filters icon button,
    // then active filters as chips with the count.
    return (
      <div
        className={cn(
          "flex shrink-0 flex-col gap-2.5",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          {search ? (
            <SearchField
              className="min-w-0 flex-1 gap-1"
              dense
              onChange={setDraftQ}
              value={draftQ}
            />
          ) : (
            <PeriodSwitch />
          )}
          <FilterMenu />
        </div>
        <FilterChips countLabel={countLabel} periodSwitch={!search} />
      </div>
    )
  }

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
      {search ? (
        <SearchField
          className="ml-auto w-full min-w-0 gap-1 sm:w-64"
          onChange={setDraftQ}
          value={draftQ}
        />
      ) : null}
    </div>
  )
}
