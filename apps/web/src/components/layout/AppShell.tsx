import { Navigate, Outlet } from "react-router"

import { AppHeader } from "@/components/layout/AppHeader"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { DashboardSkeleton } from "@/components/layout/DashboardSkeleton"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useGetMe } from "@/hooks/users/use-me"

function readSidebarOpen() {
  const match = document.cookie.match(/(?:^|; )sidebar_state=(true|false)/)
  return match ? match[1] === "true" : true
}

export function AppShell() {
  const me = useGetMe()

  if (me.isPending) return <DashboardSkeleton />
  if (!me.data) return <Navigate replace to="/login" />

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={readSidebarOpen()}>
        <AppSidebar user={me.data} />
        <SidebarInset className="bg-card md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:ring-1 md:peer-data-[variant=inset]:ring-border">
          <AppHeader />
          <div className="flex-1 px-6 pb-6">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
