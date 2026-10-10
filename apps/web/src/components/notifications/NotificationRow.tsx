import type { ReactNode } from "react"
import {
  AlertCircleIcon,
  ClockIcon,
  FileImageIcon,
  FileTextIcon,
} from "lucide-react"

import type { NotificationItem } from "@/components/notifications/notification-items"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type NotificationRowProps = {
  item: NotificationItem
  children?: ReactNode
}

function StageIcon({ item }: { item: NotificationItem }) {
  if (item.stage === "failed" || item.stage === "upload-failed") {
    return <AlertCircleIcon className="text-destructive" />
  }
  return item.isPdf ? <FileTextIcon /> : <FileImageIcon />
}

function StageMarker({ item }: { item: NotificationItem }) {
  if (item.stage === "uploading" || item.stage === "extracting") {
    return <Spinner aria-hidden className="size-3" role={undefined} />
  }
  if (item.stage === "waiting") return <ClockIcon className="size-3" />
  return null
}

export function NotificationRow({ item, children }: NotificationRowProps) {
  const failed = item.stage === "failed" || item.stage === "upload-failed"

  return (
    <li className="flex min-h-14 items-center gap-3 rounded-md px-2 py-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent [&_svg]:size-4">
        <StageIcon item={item} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={item.title}>
          {item.title}
        </p>
        <p
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground transition-opacity duration-150",
            failed && "text-destructive"
          )}
        >
          <StageMarker item={item} />
          <span className="truncate" title={item.detail}>
            {item.detail}
          </span>
        </p>
      </div>
      {children ? (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      ) : null}
    </li>
  )
}
