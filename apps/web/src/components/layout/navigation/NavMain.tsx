import { useEffect, useRef, useState, type PointerEvent } from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { NavLink, useLocation } from "react-router"

import {
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

function spendingTarget(to: string, search: string) {
  const searchParams = new URLSearchParams(search)
  searchParams.delete("view")
  searchParams.delete("page")
  const nextSearch = searchParams.toString()

  return {
    pathname: to,
    search: nextSearch ? `?${nextSearch}` : "",
  }
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
                render={<NavLink to={spendingTarget(child.to, search)} />}
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

          return (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton
                aria-controls={
                  item.children ? "spending-navigation" : undefined
                }
                aria-expanded={item.children ? spendingOpen : undefined}
                className="h-11"
                isActive={item.children ? false : isActive}
                onClick={
                  item.children
                    ? () => setSpendingOpen((open) => !open)
                    : undefined
                }
                render={
                  item.children ? undefined : (
                    <NavLink
                      end={!item.children}
                      onClick={closeMobileSidebar}
                      to={item.to}
                    />
                  )
                }
                tooltip={item.label}
              >
                <Icon />
                <span>{item.label}</span>
                {item.children ? (
                  <ChevronDownIcon
                    className="ml-auto text-muted-foreground transition-transform data-[open=true]:rotate-180"
                    data-open={spendingOpen}
                  />
                ) : null}
              </SidebarMenuButton>

              {item.children && spendingOpen ? (
                <SidebarMenuSub id="spending-navigation">
                  {item.children.map((child) => {
                    const childIsActive = pathname === child.to

                    return (
                      <SidebarMenuSubItem key={child.to}>
                        {child.disabled ? (
                          <SidebarMenuSubButton
                            aria-disabled="true"
                            className="cursor-not-allowed max-md:h-11"
                            tabIndex={-1}
                          >
                            <span className="flex-1">{child.label}</span>
                            <span className="text-xs text-muted-foreground">
                              Soon
                            </span>
                          </SidebarMenuSubButton>
                        ) : (
                          <SidebarMenuSubButton
                            className="max-md:h-11"
                            isActive={childIsActive}
                            render={
                              <NavLink
                                onClick={closeMobileSidebar}
                                to={spendingTarget(child.to, search)}
                              />
                            }
                          >
                            <span>{child.label}</span>
                          </SidebarMenuSubButton>
                        )}
                      </SidebarMenuSubItem>
                    )
                  })}
                </SidebarMenuSub>
              ) : null}
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
