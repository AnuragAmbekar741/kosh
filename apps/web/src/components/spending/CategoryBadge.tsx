import { CheckIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const CATEGORY_STYLES = {
  Entertainment:
    "bg-category-entertainment text-category-entertainment-foreground",
  Food: "bg-category-food text-category-food-foreground",
  Health: "bg-category-health text-category-health-foreground",
  Housing: "bg-category-housing text-category-housing-foreground",
  Other: "bg-category-other text-category-other-foreground",
  Shopping: "bg-category-shopping text-category-shopping-foreground",
  Transport: "bg-category-transport text-category-transport-foreground",
  Travel: "bg-category-travel text-category-travel-foreground",
  Utilities: "bg-category-utilities text-category-utilities-foreground",
} as const

type KnownCategory = keyof typeof CATEGORY_STYLES

export const CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Entertainment",
  "Shopping",
  "Health",
  "Utilities",
  "Travel",
  "Other",
] as const satisfies readonly KnownCategory[]

const SWATCH_STYLES: Record<KnownCategory, string> = {
  Entertainment: "bg-category-entertainment-foreground",
  Food: "bg-category-food-foreground",
  Health: "bg-category-health-foreground",
  Housing: "bg-category-housing-foreground",
  Other: "bg-category-other-foreground",
  Shopping: "bg-category-shopping-foreground",
  Transport: "bg-category-transport-foreground",
  Travel: "bg-category-travel-foreground",
  Utilities: "bg-category-utilities-foreground",
}

type CategoryBadgeProps = {
  category: string | null
  disabled?: boolean
  onSelect?: (category: string) => void
}

function categoryClass(category: string) {
  return CATEGORY_STYLES[category as KnownCategory] ?? CATEGORY_STYLES.Other
}

function CategoryBadgeLabel({ category }: { category: string | null }) {
  return (
    <Badge
      className={cn(
        "shrink-0 border-transparent",
        categoryClass(category ?? "Other")
      )}
      variant="outline"
    >
      {category ?? "Category"}
    </Badge>
  )
}

export function CategoryBadge({
  category,
  disabled,
  onSelect,
}: CategoryBadgeProps) {
  if (!onSelect) {
    return <CategoryBadgeLabel category={category} />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={
          category
            ? `Change category, currently ${category}`
            : "Add category"
        }
        disabled={disabled}
        render={
          <button
            className="w-fit shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            type="button"
          />
        }
      >
        <CategoryBadgeLabel category={category} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-40">
        {CATEGORIES.map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => onSelect(option)}
          >
            <span
              aria-hidden="true"
              className={cn("size-2.5 rounded-full", SWATCH_STYLES[option])}
            />
            {option}
            {category === option ? (
              <CheckIcon className="ml-auto" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
