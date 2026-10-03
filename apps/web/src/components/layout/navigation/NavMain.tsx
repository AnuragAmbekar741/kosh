import { useEffect, useRef, useState, type PointerEvent } from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { NavLink, useLocation } from "react-router"

import { cn } from "@/lib/utils"

import {
  navChildTarget,
  navigation,
  type NavChild,
  type NavItem,
} from "@/components/layout/navigation/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

function isItemActive(item: NavItem, pathname: string) {
  return (
    item.to === pathname ||
    Boolean(item.matchPrefix && pathname.startsWith(`${item.matchPrefix}/`))
  )
}

function SpendingRailMenu({ item }: { item: NavItem }) {
  const { pathname, search } = useLocation()
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const Icon = item.icon

  function clearCloseTimer() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }

  function openOnHover(event: PointerEvent) {
    if (event.pointerType === "touch") return
    clearCloseTimer()
    setOpen(true)
  }

  function closeAfterHover() {
    clearCloseTimer()
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  useEffect(() => () => clearCloseTimer(), [])

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger
        onClick={(event) => {
          if (open && event.detail > 0) event.preventDefault()
        }}
        onPointerEnter={openOnHover}
        onPointerLeave={closeAfterHover}
        render={
          <SidebarMenuButton
            aria-label="Open Spending navigation"
            isActive={isItemActive(item, pathname)}
          />
        }
      >
        <Icon />
        <span className="sr-only">Spending</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-44"
        onPointerEnter={openOnHover}
        onPointerLeave={closeAfterHover}
        side="right"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Spending</DropdownMenuLabel>
          {item.children?.map((child: NavChild) => {
            const ChildIcon = child.icon
            const isActive = pathname === child.to

            return child.disabled ? (
              <DropdownMenuItem disabled key={child.to}>
                <ChildIcon />
                {child.label}
                <span className="ml-auto text-xs text-muted-foreground">
                  Soon
                </span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                aria-current={isActive ? "page" : undefined}
                key={child.to}
                render={<NavLink to={navChildTarget(child.to, search)} />}
              >
                <ChildIcon />
                {child.label}
                {isActive ? <CheckIcon className="ml-auto" /> : null}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const subButtonClass =
  "h-8 translate-x-0 text-muted-foreground transition-colors max-md:h-11 data-active:font-medium [&>svg]:text-muted-foreground data-active:[&>svg]:text-sidebar-accent-foreground hover:[&>svg]:text-sidebar-accent-foreground"

export function NavMain() {
  const { pathname, search } = useLocation()
  const { isMobile, setOpenMobile, state } = useSidebar()
  const [spendingOpen, setSpendingOpen] = useState(true)

  function closeMobileSidebar() {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarGroup>
      <SidebarMenu className="gap-1">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = isItemActive(item, pathname)

          if (item.children && state === "collapsed" && !isMobile) {
            return (
              <SidebarMenuItem key={item.to}>
                <SpendingRailMenu item={item} />
              </SidebarMenuItem>
            )
          }

          if (!item.children) {
            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  className="max-md:h-11"
                  isActive={isActive}
                  render={
                    <NavLink end onClick={closeMobileSidebar} to={item.to} />
                  }
                  tooltip={item.label}
                >
                  <Icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          return (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton
                aria-controls="spending-navigation"
                aria-expanded={spendingOpen}
                className={cn(
                  "max-md:h-11",
                  // Section is "current" without stealing the child's highlight.
                  isActive && "font-medium text-sidebar-foreground"
                )}
                // Collapsed: the parent carries the highlight for its hidden child.
                isActive={isActive && !spendingOpen}
                onClick={() => setSpendingOpen((open) => !open)}
                tooltip={item.label}
              >
                <Icon />
                <span>{item.label}</span>
                <ChevronDownIcon
                  className="ml-auto text-muted-foreground transition-transform duration-200 data-[open=false]:-rotate-90 motion-reduce:transition-none"
                  data-open={spendingOpen}
                />
              </SidebarMenuButton>

              <div
                className="grid transition-[grid-template-rows,opacity] duration-200 ease-out data-[open=false]:grid-rows-[0fr] data-[open=false]:opacity-0 data-[open=true]:grid-rows-[1fr] motion-reduce:transition-none"
                data-open={spendingOpen}
                inert={!spendingOpen}
              >
                <div className="overflow-hidden">
                  <SidebarMenuSub
                    className="mx-0 translate-x-0 gap-0.5 border-l-0 px-0 py-1 pl-4"
                    id="spending-navigation"
                  >
                    {item.children.map((child) => {
                      const ChildIcon = child.icon
                      const childIsActive = pathname === child.to

                      return (
                        <SidebarMenuSubItem key={child.to}>
                          {child.disabled ? (
                            <SidebarMenuSubButton
                              aria-disabled="true"
                              className={subButtonClass}
                              tabIndex={-1}
                            >
                              <ChildIcon />
                              <span className="flex-1">{child.label}</span>
                              <span className="text-xs text-muted-foreground">
                                Soon
                              </span>
                            </SidebarMenuSubButton>
                          ) : (
                            <SidebarMenuSubButton
                              className={subButtonClass}
                              isActive={childIsActive}
                              render={
                                <NavLink
                                  onClick={closeMobileSidebar}
                                  to={navChildTarget(child.to, search)}
                                />
                              }
                            >
                              <ChildIcon />
                              <span>{child.label}</span>
                            </SidebarMenuSubButton>
                          )}
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </div>
              </div>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
