import type { LucideIcon } from "lucide-react"
import { LayoutDashboard, Receipt } from "lucide-react"

export type NavItem = {
  label: string
  to: string
  icon: LucideIcon
}

export const navigation: NavItem[] = [
  { label: "Overview", to: "/overview", icon: LayoutDashboard },
  { label: "Spending", to: "/spending", icon: Receipt },
]

export function getNavItem(pathname: string): NavItem | undefined {
  return navigation.find((item) => item.to === pathname)
}
