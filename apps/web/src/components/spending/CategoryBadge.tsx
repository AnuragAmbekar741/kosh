import { CheckIcon } from "lucide-react"

import type { Category } from "@/api/spend-items/spend-items.types"
import {
  CATEGORIES,
  categorySwatchClass,
  categoryTintClass,
} from "@/components/spending/categories"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type CategoryBadgeProps = {
  category: Category | null
  disabled?: boolean
  onSelect?: (category: Category) => void
}

function CategoryBadgeLabel({ category }: { category: Category | null }) {
  return (
    <Badge
      className={cn(
        "shrink-0",
        category
          ? cn("border-transparent", categoryTintClass(category))
          : "text-muted-foreground"
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
            : "Choose category"
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
      <DropdownMenuContent align="start" className="w-auto min-w-44">
        {CATEGORIES.map((option) => (
          <DropdownMenuItem key={option} onClick={() => onSelect(option)}>
            <span
              aria-hidden="true"
              className={cn(
                "size-2.5 rounded-full",
                categorySwatchClass(option)
              )}
            />
            {option}
            {category === option ? <CheckIcon className="ml-auto" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
