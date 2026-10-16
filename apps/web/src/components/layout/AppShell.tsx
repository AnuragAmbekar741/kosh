import { Navigate, Outlet } from "react-router"

import { AgentWidget } from "@/components/agent/AgentWidget"
import { AppHeader } from "@/components/layout/AppHeader"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { DashboardSkeleton } from "@/components/layout/DashboardSkeleton"
import { PhoneTabBar } from "@/components/layout/navigation/PhoneTabBar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  AgentPanelContext,
  useAgentPanelState,
} from "@/hooks/agent/use-agent-panel"
import { UploadsContext, useUploadsState } from "@/hooks/documents/use-uploads"
import { useIsMobile } from "@/hooks/use-mobile"
import { useGetMe } from "@/hooks/users/use-me"

function readSidebarOpen() {
  const match = document.cookie.match(/(?:^|; )sidebar_state=(true|false)/)
  return match ? match[1] === "true" : true
}

export function AppShell() {
  const me = useGetMe()
  const uploads = useUploadsState()
  const agent = useAgentPanelState()
  const isPhone = useIsMobile()

  if (me.isPending) return <DashboardSkeleton />
  if (!me.data) return <Navigate replace to="/login" />

  return (
    <UploadsContext.Provider value={uploads}>
      <AgentPanelContext.Provider value={agent}>
        <TooltipProvider>
          <SidebarProvider
            className="h-dvh overflow-hidden"
            defaultOpen={readSidebarOpen()}
          >
            {/* Phones navigate with the bottom tab bar instead. */}
            {isPhone ? null : <AppSidebar user={me.data} />}
            <SidebarInset className="max-h-dvh min-h-0 overflow-hidden bg-card md:max-h-[calc(100dvh-1rem)] md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:ring-1 md:peer-data-[variant=inset]:ring-border">
              <AppHeader />
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 md:px-6 md:pb-6">
                <Outlet />
              </div>
              {isPhone ? <PhoneTabBar user={me.data} /> : null}
            </SidebarInset>
          </SidebarProvider>
          <AgentWidget showLauncher={!isPhone} />
          {/* Bottom-right belongs to the assistant launcher. */}
          <Toaster position="top-center" />
        </TooltipProvider>
      </AgentPanelContext.Provider>
    </UploadsContext.Provider>
  )
}
