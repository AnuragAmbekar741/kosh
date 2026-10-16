import { useRef, useState, type ReactNode } from "react"
import {
  CalendarIcon,
  FileTextIcon,
  ListFilterIcon,
  TagIcon,
  XIcon,
} from "lucide-react"
import type { DateRange as DayPickerRange } from "react-day-picker"

import type { SpendSource } from "@/api/spend-items/spend-items.types"
import {
  CATEGORIES,
  categorySwatchClass,
} from "@/components/spending/categories"
import {
  DATE_PRESETS,
  fromIsoDate,
  toIsoDate,
  type DateFilter,
  type DateRange,
} from "@/components/spending/spend-period"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useSpendFilters } from "@/hooks/spend-items/use-spend-filters"
import { cn } from "@/lib/utils"

const DATE_ITEMS: { value: Exclude<DateFilter, "custom">; label: string }[] = [
  { value: "all", label: "All time" },
  ...DATE_PRESETS,
]

const SOURCE_ITEMS: { value: SpendSource | "all"; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "document", label: "Document" },
  { value: "manual", label: "Manual entry" },
]

function sourceLabel(source: SpendSource | undefined) {
  return SOURCE_ITEMS.find((item) => item.value === (source ?? "all"))?.label
}

function categoryLabel(count: number) {
  return count ? `${count} selected` : "Any"
}

function FiltersButtonContent({ count }: { count: number }) {
  return (
    <>
      <ListFilterIcon data-icon="inline-start" />
      Filters
      {count ? (
        <Badge className="tabular-nums" variant="secondary">
          {count}
        </Badge>
      ) : null}
    </>
  )
}

function SubmenuLabel({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="flex-1">{label}</span>
      <span className="max-w-32 truncate text-xs text-muted-foreground">
        {value}
      </span>
    </>
  )
}

function CategorySwatch({
  category,
}: {
  category: (typeof CATEGORIES)[number]
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2.5 rounded-full", categorySwatchClass(category))}
    />
  )
}

function CustomRangeCalendar({
  draft,
  months,
  onSelect,
}: {
  draft: DayPickerRange | undefined
  months: number
  onSelect: (next: DayPickerRange | undefined) => void
}) {
  return (
    <Calendar
      defaultMonth={draft?.from}
      mode="range"
      numberOfMonths={months}
      onSelect={onSelect}
      resetOnSelect
      selected={draft}
    />
  )
}

function draftFrom(range: DateRange | null): DayPickerRange | undefined {
  return range
    ? { from: fromIsoDate(range.from), to: fromIsoDate(range.to) }
    : undefined
}

function DesktopFilterMenu() {
  const filters = useSpendFilters()
  const anchorRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [rangeOpen, setRangeOpen] = useState(false)
  const [draft, setDraft] = useState<DayPickerRange | undefined>()

  function openCustomRange() {
    setDraft(draftFrom(filters.range))
    setMenuOpen(false)
    setRangeOpen(true)
  }

  function applyRange() {
    if (!draft?.from || !draft.to) return
    filters.applyCustomRange(toIsoDate(draft.from), toIsoDate(draft.to))
    setRangeOpen(false)
  }

  return (
    <div className="hidden md:block" ref={anchorRef}>
      <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
        <DropdownMenuTrigger
          render={
            <Button variant="outline">
              <FiltersButtonContent count={filters.filterCount} />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <CalendarIcon />
                <SubmenuLabel label="Date" value={filters.dateLabel} />
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-48">
                <DropdownMenuRadioGroup
                  onValueChange={(value: string) => {
                    if (value !== "custom")
                      filters.setDate(value as Exclude<DateFilter, "custom">)
                  }}
                  value={filters.date}
                >
                  {DATE_ITEMS.map((item) => (
                    <DropdownMenuRadioItem key={item.value} value={item.value}>
                      {item.label}
                    </DropdownMenuRadioItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioItem
                    onClick={openCustomRange}
                    value="custom"
                  >
                    Custom range…
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <TagIcon />
                <SubmenuLabel
                  label="Category"
                  value={categoryLabel(filters.categories.length)}
                />
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-48">
                {CATEGORIES.map((category) => (
                  <DropdownMenuCheckboxItem
                    checked={filters.categories.includes(category)}
                    key={category}
                    onCheckedChange={() => filters.toggleCategory(category)}
                  >
                    <CategorySwatch category={category} />
                    {category}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FileTextIcon />
                <SubmenuLabel
                  label="Source"
                  value={sourceLabel(filters.source) ?? ""}
                />
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-48">
                <DropdownMenuRadioGroup
                  onValueChange={(value: string) =>
                    filters.setSource(
                      value === "all" ? null : (value as SpendSource)
                    )
                  }
                  value={filters.source ?? "all"}
                >
                  {SOURCE_ITEMS.map((item) => (
                    <DropdownMenuRadioItem key={item.value} value={item.value}>
                      {item.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          {filters.filterCount ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={filters.clearFilters}>
                <XIcon />
                Clear filters
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover onOpenChange={setRangeOpen} open={rangeOpen}>
        <PopoverContent align="start" anchor={anchorRef} className="w-auto">
          <PopoverHeader>
            <PopoverTitle>Custom range</PopoverTitle>
            <PopoverDescription>
              Choose a start and end date, then apply.
            </PopoverDescription>
          </PopoverHeader>
          <CustomRangeCalendar draft={draft} months={2} onSelect={setDraft} />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setRangeOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled={!draft?.from || !draft.to} onClick={applyRange}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function SheetSection({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

function MobileFilterSheet() {
  const filters = useSpendFilters()
  const [draft, setDraft] = useState<DayPickerRange | undefined>()
  const [showCustom, setShowCustom] = useState(false)

  function handleOpenChange(open: boolean) {
    if (!open) return
    setDraft(draftFrom(filters.range))
    setShowCustom(filters.date === "custom")
  }

  return (
    <Sheet onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button
            aria-label={
              filters.filterCount
                ? `Filters, ${filters.filterCount} on`
                : "Filters"
            }
            className="relative md:hidden"
            size="icon-dense"
            variant="outline"
          >
            <ListFilterIcon />
            {filters.filterCount ? (
              <span
                aria-hidden
                className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-foreground ring-2 ring-background"
              />
            ) : null}
          </Button>
        }
      />
      <SheetContent
        className="max-h-[85dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)]"
        side="bottom"
      >
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Narrow bills and items by date, category, or source.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-4">
          <SheetSection title="Date">
            {DATE_ITEMS.map((item) => (
              <Toggle
                key={item.value}
                onPressedChange={() => {
                  setShowCustom(false)
                  filters.setDate(item.value)
                }}
                pressed={!showCustom && filters.date === item.value}
                variant="outline"
              >
                {item.label}
              </Toggle>
            ))}
            <Toggle
              onPressedChange={() => setShowCustom(true)}
              pressed={showCustom}
              variant="outline"
            >
              Custom range
            </Toggle>
          </SheetSection>
          {showCustom ? (
            <div className="flex flex-col gap-2">
              <CustomRangeCalendar
                draft={draft}
                months={1}
                onSelect={setDraft}
              />
              <Button
                disabled={!draft?.from || !draft.to}
                onClick={() => {
                  if (!draft?.from || !draft.to) return
                  filters.applyCustomRange(
                    toIsoDate(draft.from),
                    toIsoDate(draft.to)
                  )
                }}
              >
                Apply range
              </Button>
            </div>
          ) : null}
          <SheetSection title="Category">
            {CATEGORIES.map((category) => (
              <Toggle
                key={category}
                onPressedChange={() => filters.toggleCategory(category)}
                pressed={filters.categories.includes(category)}
                variant="outline"
              >
                <CategorySwatch category={category} />
                {category}
              </Toggle>
            ))}
          </SheetSection>
          <SheetSection title="Source">
            {SOURCE_ITEMS.map((item) => (
              <Toggle
                key={item.value}
                onPressedChange={() =>
                  filters.setSource(item.value === "all" ? null : item.value)
                }
                pressed={(filters.source ?? "all") === item.value}
                variant="outline"
              >
                {item.label}
              </Toggle>
            ))}
          </SheetSection>
        </div>
        <SheetFooter>
          <Button
            disabled={!filters.filterCount}
            onClick={() => {
              setShowCustom(false)
              filters.clearFilters()
            }}
            variant="outline"
          >
            Clear filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/** Insights on phones: the common date presets, one tap each. */
const PERIODS = [
  { value: "this-month", label: "Month", name: "This month" },
  { value: "last-3-months", label: "3 mo", name: "Last 3 months" },
  { value: "this-year", label: "Year", name: "This year" },
  { value: "all", label: "All", name: "All time" },
] as const

function isSwitchPeriod(date: DateFilter) {
  return PERIODS.some((period) => period.value === date)
}

/** A compact period switch for the phone Insights toolbar. */
export function PeriodSwitch() {
  const filters = useSpendFilters()

  return (
    <ToggleGroup
      aria-label="Period"
      onValueChange={(value: string[]) => {
        const next = PERIODS.find((period) => period.value === value[0])
        if (next) filters.setDate(next.value)
      }}
      size="dense"
      spacing={0}
      value={isSwitchPeriod(filters.date) ? [filters.date] : []}
      variant="outline"
    >
      {PERIODS.map((period) => (
        <ToggleGroupItem
          aria-label={period.name}
          key={period.value}
          value={period.value}
        >
          {period.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

type FilterChipProps = {
  label: string
  onRemove: () => void
  swatch?: (typeof CATEGORIES)[number]
}

function FilterChip({ label, onRemove, swatch }: FilterChipProps) {
  return (
    <button
      aria-label={`Remove ${label} filter`}
      className="inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-lg border bg-accent pr-2 pl-2.5 text-xs text-accent-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={onRemove}
      type="button"
    >
      {swatch ? <CategorySwatch category={swatch} /> : null}
      {label}
      <XIcon aria-hidden className="size-3 text-muted-foreground" />
    </button>
  )
}

type FilterChipsProps = {
  /** e.g. "18 bills", right-aligned. */
  countLabel?: string | null
  /** Insights: the period switch already shows its own dates. */
  periodSwitch?: boolean
}

/** Phones: active filters as small chips under the toolbar; a tap clears one. */
export function FilterChips({
  countLabel,
  periodSwitch = false,
}: FilterChipsProps) {
  const filters = useSpendFilters()
  const showDate =
    filters.date !== "all" && !(periodSwitch && isSwitchPeriod(filters.date))
  const hasChips =
    showDate || filters.categories.length > 0 || Boolean(filters.source)

  if (!hasChips && !countLabel) return null

  return (
    <div className="flex items-center gap-2">
      <div className="no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto">
        {showDate ? (
          <FilterChip
            label={filters.dateLabel}
            onRemove={() => filters.setDate("all")}
          />
        ) : null}
        {filters.categories.map((category) => (
          <FilterChip
            key={category}
            label={category}
            onRemove={() => filters.toggleCategory(category)}
            swatch={category}
          />
        ))}
        {filters.source ? (
          <FilterChip
            label={sourceLabel(filters.source) ?? filters.source}
            onRemove={() => filters.setSource(null)}
          />
        ) : null}
      </div>
      {countLabel ? (
        <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
          {countLabel}
        </span>
      ) : null}
    </div>
  )
}

/** One Filters button: a submenu menu on desktop, a bottom sheet on phones. */
export function FilterMenu() {
  return (
    <>
      <DesktopFilterMenu />
      <MobileFilterSheet />
    </>
  )
}
