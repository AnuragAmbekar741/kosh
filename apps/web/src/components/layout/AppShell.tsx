import { Navigate, Outlet } from "react-router"

import { AgentWidget } from "@/components/agent/AgentWidget"
import { AppHeader } from "@/components/layout/AppHeader"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { DashboardSkeleton } from "@/components/layout/DashboardSkeleton"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { UploadsContext, useUploadsState } from "@/hooks/documents/use-uploads"
import { useGetMe } from "@/hooks/users/use-me"

function readSidebarOpen() {
  const match = document.cookie.match(/(?:^|; )sidebar_state=(true|false)/)
  return match ? match[1] === "true" : true
}

export function AppShell() {
  const me = useGetMe()
  const uploads = useUploadsState()

  if (me.isPending) return <DashboardSkeleton />
  if (!me.data) return <Navigate replace to="/login" />

  return (
    <UploadsContext.Provider value={uploads}>
      <TooltipProvider>
        <SidebarProvider
          className="h-svh overflow-hidden"
          defaultOpen={readSidebarOpen()}
        >
          <AppSidebar user={me.data} />
          <SidebarInset className="max-h-svh min-h-0 overflow-hidden bg-card md:max-h-[calc(100svh-1rem)] md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:ring-1 md:peer-data-[variant=inset]:ring-border">
            <AppHeader />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6">
              <Outlet />
            </div>
          </SidebarInset>
        </SidebarProvider>
        <AgentWidget />
        {/* Bottom-right belongs to the assistant launcher. */}
        <Toaster position="bottom-center" />
      </TooltipProvider>
    </UploadsContext.Provider>
  )
}
