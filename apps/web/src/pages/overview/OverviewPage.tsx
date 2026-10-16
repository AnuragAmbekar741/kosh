import { Link } from "react-router"

import { OverviewStarter } from "@/components/overview/OverviewStarter"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyEyebrow,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { useIsMobile } from "@/hooks/use-mobile"

export function OverviewPage() {
  const isPhone = useIsMobile()

  // Desktop: the starter fills the panel edge to edge, past the outlet padding.
  if (!isPhone) {
    return (
      <main className="-mx-6 -mb-6 flex h-full min-h-0 flex-col overflow-hidden">
        <OverviewStarter />
      </main>
    )
  }

  return (
    <main className="flex h-full min-h-0 w-full flex-col overflow-hidden pt-6">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyEyebrow>Overview</EmptyEyebrow>
            <EmptyTitle>Nothing to summarize yet</EmptyTitle>
            <EmptyDescription>
              Overview appears after you add spending to review.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button nativeButton={false} render={<Link to="/spending/bills" />}>
              Go to Spending
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    </main>
  )
}
