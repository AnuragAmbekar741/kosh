import { useLocation } from "react-router"
import { toast } from "sonner"

import { formatDate } from "@/components/spending/spending-formatters"
import { useSpendFilters } from "@/hooks/spend-items/use-spend-filters"

/**
 * Toasts a saved bill. The date filter never changes on its own (other bills
 * would seem to vanish), so a bill dated outside it gets a Show action.
 */
export function useBillSavedToast() {
  const { pathname } = useLocation()
  const filters = useSpendFilters()

  return function billSaved(title: string, spentAt?: string | null) {
    if (
      pathname.startsWith("/spending/") &&
      spentAt &&
      !filters.isInView(spentAt)
    ) {
      toast.success(title, {
        description: `Dated ${formatDate(spentAt)}, outside your date filter.`,
        action: { label: "Show", onClick: filters.revealDate },
      })
    } else {
      toast.success(title)
    }
  }
}
