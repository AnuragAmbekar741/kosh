import { useState } from "react"
import { BellIcon, RotateCwIcon, Trash2Icon, XIcon } from "lucide-react"

import type {
  NotificationGroups,
  NotificationItem,
} from "@/components/notifications/notification-items"
import { NotificationRow } from "@/components/notifications/NotificationRow"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"

type NotificationActions = {
  onReview: (documentId: string) => void
  onDiscard: (item: NotificationItem) => void
  onRemoveDocument: (documentId: string) => void
  onRetryUpload: (key: string) => void
  onRemoveUpload: (key: string) => void
  removingId: string | null
}

type NotificationListProps = NotificationActions & {
  groups: NotificationGroups
}

type ReadyActionsProps = {
  item: NotificationItem
  onReview: (documentId: string) => void
  onDiscard: (item: NotificationItem) => void
  removing: boolean
}

/** Review or discard a bill waiting for review; discarding asks once, in place. */
function ReadyActions({
  item,
  onReview,
  onDiscard,
  removing,
}: ReadyActionsProps) {
  const [confirming, setConfirming] = useState(false)

  if (confirming || removing) {
    return (
      <>
        <Button
          disabled={removing}
          onClick={() => setConfirming(false)}
          size="sm"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          aria-label={`Discard ${item.title}`}
          disabled={removing}
          onClick={() => onDiscard(item)}
          size="sm"
          variant="destructive"
        >
          {removing ? <Spinner data-icon="inline-start" /> : null}
          Discard
        </Button>
      </>
    )
  }
  return (
    <>
      <Button
        aria-label={`Discard ${item.title}`}
        onClick={() => setConfirming(true)}
        size="icon-sm"
        variant="ghost"
      >
        <Trash2Icon />
      </Button>
      <Button onClick={() => onReview(item.id)} size="sm">
        Review
      </Button>
    </>
  )
}

function NotificationActionsFor({
  item,
  onReview,
  onDiscard,
  onRemoveDocument,
  onRetryUpload,
  onRemoveUpload,
  removingId,
}: NotificationActions & { item: NotificationItem }) {
  if (item.stage === "ready") {
    return (
      <ReadyActions
        item={item}
        onDiscard={onDiscard}
        onReview={onReview}
        removing={removingId === item.id}
      />
    )
  }
  if (item.stage === "upload-failed") {
    return (
      <>
        <Button
          aria-label={`Retry ${item.title}`}
          onClick={() => onRetryUpload(item.id)}
          size="icon-sm"
          variant="outline"
        >
          <RotateCwIcon />
        </Button>
        <Button
          aria-label={`Remove ${item.title}`}
          onClick={() => onRemoveUpload(item.id)}
          size="icon-sm"
          variant="ghost"
        >
          <XIcon />
        </Button>
      </>
    )
  }
  if (item.stage === "failed") {
    const removing = removingId === item.id
    return (
      <Button
        disabled={removing}
        onClick={() => onRemoveDocument(item.id)}
        size="sm"
        variant="outline"
      >
        {removing ? <Spinner data-icon="inline-start" /> : null}
        Remove
      </Button>
    )
  }
  return null
}

function NotificationSection({
  label,
  items,
  ...actions
}: NotificationActions & { label: string; items: NotificationItem[] }) {
  if (items.length === 0) return null

  return (
    <section aria-label={label} className="flex flex-col gap-1">
      <h3 className="px-2 pt-1 text-xs font-medium text-muted-foreground">
        {label}
      </h3>
      <ul className="flex flex-col">
        {items.map((item) => (
          <NotificationRow item={item} key={item.id}>
            <NotificationActionsFor item={item} {...actions} />
          </NotificationRow>
        ))}
      </ul>
    </section>
  )
}

export function NotificationList({
  groups,
  ...actions
}: NotificationListProps) {
  if (groups.needsYou.length === 0 && groups.inProgress.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BellIcon />
          </EmptyMedia>
          <EmptyTitle>Nothing here yet</EmptyTitle>
          <EmptyDescription>
            Uploads and extractions show up here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <NotificationSection
        items={groups.needsYou}
        label="Needs you"
        {...actions}
      />
      <NotificationSection
        items={groups.inProgress}
        label="In progress"
        {...actions}
      />
    </div>
  )
}
