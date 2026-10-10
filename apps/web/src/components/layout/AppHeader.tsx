import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { NavLink, useLocation } from "react-router"

import {
  getNavChild,
  getNavItem,
  navChildTarget,
  type NavItem,
} from "@/components/layout/navigation/navigation"
import { NotificationCenter } from "@/components/notifications/NotificationCenter"
import { AddSpendingDialog } from "@/components/spending/AddSpendingDialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

function ChildSwitcher({ item }: { item: NavItem }) {
  const { pathname, search } = useLocation()
  const current = getNavChild(item, pathname)
  const CurrentIcon = current?.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Switch ${item.label} view`}
            className="-ml-1 gap-1.5 px-2 font-medium"
            size="sm"
            variant="ghost"
          />
        }
      >
        {CurrentIcon ? <CurrentIcon className="text-muted-foreground" /> : null}
        {current?.label ?? item.label}
        <ChevronDownIcon className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {item.children?.map((child) => {
          const ChildIcon = child.icon
          const isActive = child.to === pathname

          return (
            <DropdownMenuItem
              aria-current={isActive ? "page" : undefined}
              disabled={child.disabled}
              key={child.to}
              render={<NavLink to={navChildTarget(child.to, search)} />}
            >
              <ChildIcon />
              {child.label}
              {isActive ? <CheckIcon className="ml-auto" /> : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppHeader() {
  const { pathname } = useLocation()
  const current = getNavItem(pathname)

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <SidebarTrigger className="size-11 sm:size-9" />
      <Separator orientation="vertical" />
      {current?.children ? (
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1"
        >
          <h1 className="text-sm text-muted-foreground max-sm:sr-only">
            {current.label}
          </h1>
          <ChevronRightIcon
            aria-hidden
            className="size-3.5 text-muted-foreground/70 max-sm:hidden"
          />
          <ChildSwitcher item={current} />
        </nav>
      ) : (
        <h1 className="text-sm font-medium">{current?.label ?? "Kosh"}</h1>
      )}
      <div className="ml-auto flex items-center gap-2">
        {pathname.startsWith("/spending/") ? <AddSpendingDialog /> : null}
        <NotificationCenter />
      </div>
    </header>
  )
}
