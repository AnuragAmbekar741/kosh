import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuSkeleton,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

function readSidebarOpen() {
  const match = document.cookie.match(/(?:^|; )sidebar_state=(true|false)/)
  return match ? match[1] === "true" : true
}

export function DashboardSkeleton() {
  return (
    <SidebarProvider
      aria-busy="true"
      aria-label="Opening your workspace"
      defaultOpen={readSidebarOpen()}
      role="status"
    >
      <span className="sr-only">Opening your workspace</span>
      <Sidebar
        className="[&_[data-mobile=true]]:bg-card"
        collapsible="icon"
        variant="inset"
      >
        <SidebarHeader>
          <Skeleton className="h-11 w-24" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu className="gap-1">
              <SidebarMenuSkeleton className="h-11" showIcon />
              <SidebarMenuSkeleton className="h-11" showIcon />
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-card md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:ring-1 md:peer-data-[variant=inset]:ring-border">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
          <Skeleton className="size-11 md:size-8" />
          <Separator orientation="vertical" />
          <Skeleton className="h-4 w-20" />
        </header>
        <div className="flex-1 px-6 pb-6 pt-6">
          <Skeleton className="h-full min-h-64 w-full rounded-xl" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
