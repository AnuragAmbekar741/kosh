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
  /** Makes the whole row the target (the title button stretches over it). */
  onOpen?: () => void
  openLabel?: string
  /** Replaces the status line, e.g. while a discard waits for confirmation. */
  detail?: string
  tone?: "default" | "destructive"
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

export function NotificationRow({
  item,
  onOpen,
  openLabel,
  detail,
  tone = "default",
  children,
}: NotificationRowProps) {
  const failed = item.stage === "failed" || item.stage === "upload-failed"
  const destructive = tone === "destructive" || failed

  return (
    <li
      className={cn(
        "group/row relative flex min-h-14 items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-foreground/6 has-focus-visible:bg-foreground/6",
        tone === "destructive" &&
          "bg-destructive/5 hover:bg-destructive/10 has-focus-visible:bg-destructive/10"
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent transition-colors group-hover/row:bg-background [&_svg]:size-4">
        <StageIcon item={item} />
      </span>
      <div className="min-w-0 flex-1">
        {onOpen ? (
          <button
            aria-label={openLabel}
            className="block w-full truncate rounded-sm text-left text-sm font-medium outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring"
            onClick={onOpen}
            title={item.title}
            type="button"
          >
            {item.title}
          </button>
        ) : (
          <p className="truncate text-sm font-medium" title={item.title}>
            {item.title}
          </p>
        )}
        <p
          aria-live={detail ? "polite" : undefined}
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground",
            destructive && "text-destructive"
          )}
        >
          {detail ? null : <StageMarker item={item} />}
          <span className="truncate" title={detail ?? item.detail}>
            {detail ?? item.detail}
          </span>
        </p>
      </div>
      {children ? (
        // Above the stretched title button, so these stay clickable.
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          {children}
        </div>
      ) : null}
    </li>
  )
}
