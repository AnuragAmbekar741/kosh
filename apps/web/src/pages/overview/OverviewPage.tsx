import { LayoutDashboardIcon } from "lucide-react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function OverviewPage() {
  return (
    <main className="flex h-full min-h-0 w-full flex-col overflow-hidden pt-6 2xl:mx-auto 2xl:max-w-7xl">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayoutDashboardIcon />
            </EmptyMedia>
            <EmptyTitle>No overview yet</EmptyTitle>
            <EmptyDescription>
              Overview appears after you add spending to review.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button nativeButton={false} render={<Link to="/spending" />}>
              Go to Spending
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    </main>
  )
}
