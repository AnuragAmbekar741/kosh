import { useLocation } from "react-router"

import { getNavItem } from "@/components/layout/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function AppHeader() {
  const { pathname } = useLocation()
  const current = getNavItem(pathname)

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <SidebarTrigger className="size-11 md:size-8" />
      <Separator orientation="vertical" />
      <h1 className="text-sm font-medium">{current?.label ?? "Kosh"}</h1>
    </header>
  )
}
