import { Navigate, Outlet, useLocation } from "react-router"

import { AgentWidget } from "@/components/agent/AgentWidget"
import { AppHeader } from "@/components/layout/AppHeader"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { DashboardSkeleton } from "@/components/layout/DashboardSkeleton"
import { PhoneNav } from "@/components/layout/navigation/PhoneNav"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  AgentPanelContext,
  useAgentPanelState,
} from "@/hooks/agent/use-agent-panel"
import {
  ChatScansContext,
  useChatScansState,
} from "@/hooks/agent/use-chat-scans"
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
  const scans = useChatScansState(uploads, (text, documentIds) => {
    void agent.chat.send(text, documentIds)
  })
  const isPhone = useIsMobile()
  const { pathname } = useLocation()

  if (me.isPending) return <DashboardSkeleton />
  if (!me.data) return <Navigate replace to="/login" />

  return (
    <UploadsContext.Provider value={uploads}>
      <AgentPanelContext.Provider value={agent}>
        <ChatScansContext.Provider value={scans}>
          <TooltipProvider>
            <SidebarProvider
              className="h-dvh overflow-hidden"
              defaultOpen={readSidebarOpen()}
            >
              {/* Phones navigate with the floating nav button instead. */}
              {isPhone ? null : <AppSidebar user={me.data} />}
              <SidebarInset className="max-h-dvh min-h-0 overflow-hidden bg-card md:max-h-[calc(100dvh-1rem)] md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:ring-1 md:peer-data-[variant=inset]:ring-border">
                <AppHeader />
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 md:px-6 md:pb-6">
                  <Outlet />
                </div>
                {/* Chat puts it in the composer row instead. */}
                {isPhone && pathname !== "/chat" ? (
                  <PhoneNav placement="floating" />
                ) : null}
              </SidebarInset>
            </SidebarProvider>
            {/* Phones chat on /chat instead of the floating panel. */}
            {isPhone ? null : <AgentWidget />}
            {/* Bottom-right belongs to the assistant launcher. */}
            <Toaster position="top-center" />
          </TooltipProvider>
        </ChatScansContext.Provider>
      </AgentPanelContext.Provider>
    </UploadsContext.Provider>
  )
}
