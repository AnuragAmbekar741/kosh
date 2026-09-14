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
      <SidebarProvider className="h-svh overflow-hidden" defaultOpen={readSidebarOpen()}>
        <AppSidebar user={me.data} />
        <SidebarInset className="min-h-0 overflow-hidden bg-card max-h-svh md:max-h-[calc(100svh-1rem)] md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:ring-1 md:peer-data-[variant=inset]:ring-border">
          <AppHeader />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
