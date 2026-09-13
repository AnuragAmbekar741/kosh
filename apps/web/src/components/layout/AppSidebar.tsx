import type { UserPublic } from "@/api/users/users.types"
import { FinanceMark } from "@/components/brand/FinanceMark"
import { NavMain } from "@/components/layout/NavMain"
import { NavUser } from "@/components/layout/NavUser"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

type AppSidebarProps = {
  user: UserPublic
}

export function AppSidebar({ user }: AppSidebarProps) {
  return (
    <Sidebar
      className="[&_[data-mobile=true]]:bg-card"
      collapsible="icon"
      variant="inset"
    >
      <SidebarHeader>
        <FinanceMark className="h-11 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:[&>span:last-child]:hidden" />
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
