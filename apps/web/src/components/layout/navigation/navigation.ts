import type { LucideIcon } from "lucide-react"
import {
  ChartNoAxesCombined,
  LayoutDashboard,
  List,
  Receipt,
  ReceiptText,
} from "lucide-react"

export type NavChild = {
  label: string
  to: string
  icon: LucideIcon
  disabled?: boolean
}

export type NavItem = {
  label: string
  to: string
  icon: LucideIcon
  matchPrefix?: string
  children?: NavChild[]
}

export const navigation: NavItem[] = [
  { label: "Overview", to: "/overview", icon: LayoutDashboard },
  {
    label: "Spending",
    to: "/spending/bills",
    matchPrefix: "/spending",
    icon: Receipt,
    children: [
      {
        label: "Analytics",
        to: "/spending/analytics",
        icon: ChartNoAxesCombined,
        disabled: true,
      },
      { label: "Bills", to: "/spending/bills", icon: ReceiptText },
      { label: "Items", to: "/spending/items", icon: List },
    ],
  },
]

export function getNavItem(pathname: string): NavItem | undefined {
  return navigation.find(
    (item) =>
      item.to === pathname ||
      (item.matchPrefix && pathname.startsWith(`${item.matchPrefix}/`))
  )
}
