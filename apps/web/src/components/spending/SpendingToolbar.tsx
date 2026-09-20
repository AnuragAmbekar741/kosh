import { useEffect, useState } from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ListFilterIcon,
  SearchIcon,
} from "lucide-react"
import type { DateRange } from "react-day-picker"

import type { SpendPeriod, SpendSource } from "@/api/spend-items/spend-items.types"
import {
  CATEGORIES,
  categorySwatchClass,
} from "@/components/spending/CategoryBadge"
import { fromIsoDate, toIsoDate } from "@/components/spending/spend-period"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useSpendFilters } from "@/hooks/spend-items/use-spend-filters"
import { cn } from "@/lib/utils"

const PERIOD_ITEMS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const

const SOURCE_ITEMS: { value: SpendSource | "all"; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "document", label: "Document" },
  { value: "manual", label: "Manual entry" },
]

type SpendingToolbarProps = {
  disabled?: boolean
}

function sourceLabel(source: SpendSource | undefined) {
  return SOURCE_ITEMS.find((item) => item.value === (source ?? "all"))?.label
}

function SearchField({
  id,
  onChange,
  value,
}: {
  id: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <Field className="min-w-0 gap-1">
      <FieldLabel className="sr-only" htmlFor={id}>
        Search merchants or items
      </FieldLabel>
      <InputGroup className="h-8 w-full md:w-56">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search"
          value={value}
        />
      </InputGroup>
    </Field>
  )
}

function CategoryMenu({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (name: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="sm" variant="outline">
            {selected.length ? `Category · ${selected.length}` : "Category"}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuGroup>
          {CATEGORIES.map((option) => (
            <DropdownMenuCheckboxItem
              checked={selected.includes(option)}
              key={option}
              onCheckedChange={() => onToggle(option)}
            >
              <span
                aria-hidden="true"
                className={cn("size-2.5 rounded-full", categorySwatchClass(option))}
              />
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SourceMenu({
  source,
  onChange,
}: {
  source: SpendSource | undefined
  onChange: (next: SpendSource | null) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="sm" variant="outline">
            {sourceLabel(source)}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuRadioGroup
          onValueChange={(value: string) =>
            onChange(value === "all" ? null : (value as SpendSource))
          }
          value={source ?? "all"}
        >
          {SOURCE_ITEMS.map((item) => (
            <DropdownMenuRadioItem key={item.value} value={item.value}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CustomRangePopover({
  from,
  onApply,
  period,
  to,
}: {
  from: string
  onApply: (from: string, to: string) => void
  period: SpendPeriod
  to: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>({
    from: fromIsoDate(from),
    to: fromIsoDate(to),
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setDraft({ from: fromIsoDate(from), to: fromIsoDate(to) })
    }
  }

  function apply() {
    const start = draft?.from
    if (!start) return
    onApply(toIsoDate(start), toIsoDate(draft.to ?? start))
    setOpen(false)
  }

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-pressed={period === "custom"}
            size="sm"
            variant={period === "custom" ? "secondary" : "ghost"}
          >
            Custom
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto">
        <PopoverHeader>
          <PopoverTitle>Custom range</PopoverTitle>
          <PopoverDescription>
            Choose a start and end date, then apply.
          </PopoverDescription>
        </PopoverHeader>
        <Calendar
          mode="range"
          numberOfMonths={2}
          onSelect={setDraft}
          selected={draft}
        />
        <div className="flex justify-end gap-2">
          <Button onClick={() => setOpen(false)} size="sm" variant="outline">
            Cancel
          </Button>
          <Button disabled={!draft?.from} onClick={apply} size="sm">
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function SpendingToolbar({ disabled = false }: SpendingToolbarProps) {
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

  const filterCount =
    filters.categories.length + (filters.source ? 1 : 0) + (filters.q ? 1 : 0)

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-3",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          className="h-11 sm:h-8"
          multiple={false}
          onValueChange={(next: string[]) => {
            const value = next[0]
            if (value === "day" || value === "week" || value === "month") {
              filters.setPeriod(value)
            }
          }}
          size="sm"
          spacing={0}
          value={[filters.period === "custom" ? "" : filters.period]}
          variant="outline"
        >
          {PERIOD_ITEMS.map((item) => (
            <ToggleGroupItem key={item.value} value={item.value}>
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <CustomRangePopover
          from={filters.from}
          onApply={filters.applyCustomRange}
          period={filters.period}
          to={filters.to}
        />
        <div className="flex items-center gap-1">
          <Button
            aria-label="Previous period"
            onClick={() => filters.shift(-1)}
            size="icon-sm"
            variant="ghost"
          >
            <ChevronLeftIcon />
          </Button>
          <p className="min-w-28 text-center text-sm font-medium">
            {filters.label}
          </p>
          <Button
            aria-label="Next period"
            onClick={() => filters.shift(1)}
            size="icon-sm"
            variant="ghost"
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <CategoryMenu
            onToggle={filters.toggleCategory}
            selected={filters.categories}
          />
          <SourceMenu onChange={filters.setSource} source={filters.source} />
          <SearchField
            id="spend-search"
            onChange={setDraftQ}
            value={draftQ}
          />
        </div>
        <Sheet>
          <SheetTrigger
            render={
              <Button className="ml-auto md:hidden" size="sm" variant="outline">
                <ListFilterIcon data-icon="inline-start" />
                Filters
                {filterCount ? (
                  <Badge variant="secondary">{filterCount}</Badge>
                ) : null}
              </Button>
            }
          />
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Narrow the ledger by category, source, or search.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-3 px-4 pb-4">
              <CategoryMenu
                onToggle={filters.toggleCategory}
                selected={filters.categories}
              />
              <SourceMenu onChange={filters.setSource} source={filters.source} />
              <SearchField
                id="spend-search-mobile"
                onChange={setDraftQ}
                value={draftQ}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
