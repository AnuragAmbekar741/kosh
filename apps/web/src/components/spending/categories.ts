import type { Category } from "@/api/spend-items/spend-items.types"

type CategoryStyle = { tint: string; swatch: string }

const CATEGORY_STYLES: Record<Category, CategoryStyle> = {
  Groceries: {
    tint: "bg-category-groceries text-category-groceries-foreground",
    swatch: "bg-category-groceries-foreground",
  },
  "Dining out": {
    tint: "bg-category-dining-out text-category-dining-out-foreground",
    swatch: "bg-category-dining-out-foreground",
  },
  Household: {
    tint: "bg-category-household text-category-household-foreground",
    swatch: "bg-category-household-foreground",
  },
  "Personal care": {
    tint: "bg-category-personal-care text-category-personal-care-foreground",
    swatch: "bg-category-personal-care-foreground",
  },
  Health: {
    tint: "bg-category-health text-category-health-foreground",
    swatch: "bg-category-health-foreground",
  },
  "Baby & kids": {
    tint: "bg-category-baby-kids text-category-baby-kids-foreground",
    swatch: "bg-category-baby-kids-foreground",
  },
  Pet: {
    tint: "bg-category-pet text-category-pet-foreground",
    swatch: "bg-category-pet-foreground",
  },
  Shopping: {
    tint: "bg-category-shopping text-category-shopping-foreground",
    swatch: "bg-category-shopping-foreground",
  },
  Transport: {
    tint: "bg-category-transport text-category-transport-foreground",
    swatch: "bg-category-transport-foreground",
  },
  Housing: {
    tint: "bg-category-housing text-category-housing-foreground",
    swatch: "bg-category-housing-foreground",
  },
  Utilities: {
    tint: "bg-category-utilities text-category-utilities-foreground",
    swatch: "bg-category-utilities-foreground",
  },
  Entertainment: {
    tint: "bg-category-entertainment text-category-entertainment-foreground",
    swatch: "bg-category-entertainment-foreground",
  },
  Travel: {
    tint: "bg-category-travel text-category-travel-foreground",
    swatch: "bg-category-travel-foreground",
  },
  Other: {
    tint: "bg-category-other text-category-other-foreground",
    swatch: "bg-category-other-foreground",
  },
}

export const CATEGORIES = Object.keys(CATEGORY_STYLES) as Category[]

export function isCategory(value: string): value is Category {
  return Object.hasOwn(CATEGORY_STYLES, value)
}

function styleFor(category: string) {
  return isCategory(category)
    ? CATEGORY_STYLES[category]
    : CATEGORY_STYLES.Other
}

export function categoryTintClass(category: Category) {
  return styleFor(category).tint
}

export function categorySwatchClass(category: Category) {
  return styleFor(category).swatch
}

/** CSS color for charts: the category's ink, which reads on both themes. */
export function categoryColor(category: Category) {
  return `var(--${styleFor(category).swatch.replace("bg-", "")})`
}
