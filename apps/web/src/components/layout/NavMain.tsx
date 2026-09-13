import { NavLink, useLocation } from "react-router"

import { navigation } from "@/components/layout/navigation"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain() {
  const { pathname } = useLocation()

  return (
    <SidebarGroup>
      <SidebarMenu className="gap-1">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.to

          return (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton
                className="h-11"
                isActive={isActive}
                render={<NavLink to={item.to} />}
                tooltip={item.label}
              >
                <Icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
