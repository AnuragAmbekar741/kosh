import { useState } from "react"
import { CheckCheckIcon, RotateCwIcon, Trash2Icon, XIcon } from "lucide-react"

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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

// On pointer devices the discard icon appears on hover or focus; touch shows it.
const REVEAL =
  "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 [@media(hover:hover)]:group-has-focus-visible/row:opacity-100 transition-opacity"

type ReadyRowProps = {
  item: NotificationItem
  onReview: (documentId: string) => void
  onDiscard: (item: NotificationItem) => void
  removing: boolean
}

/** A bill waiting for review: the row opens it; discarding asks in place. */
function ReadyRow({ item, onReview, onDiscard, removing }: ReadyRowProps) {
  const [confirming, setConfirming] = useState(false)

  if (confirming || removing) {
    return (
      <NotificationRow
        detail={removing ? "Discarding…" : "Discard this bill?"}
        item={item}
        tone="destructive"
      >
        <Button
          disabled={removing}
          onClick={() => setConfirming(false)}
          size="xs"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          aria-label={`Discard ${item.title}`}
          disabled={removing}
          onClick={() => onDiscard(item)}
          size="xs"
          variant="destructive"
        >
          {removing ? <Spinner data-icon="inline-start" /> : null}
          Discard
        </Button>
      </NotificationRow>
    )
  }

  return (
    <NotificationRow
      item={item}
      onOpen={() => onReview(item.id)}
      openLabel={`Review ${item.title}`}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={`Discard ${item.title}`}
              className={REVEAL}
              onClick={() => setConfirming(true)}
              size="icon-xs"
              variant="ghost"
            />
          }
        >
          <Trash2Icon />
        </TooltipTrigger>
        <TooltipContent>Discard</TooltipContent>
      </Tooltip>
      <Button
        onClick={() => onReview(item.id)}
        size="xs"
        tabIndex={-1}
        variant="secondary"
      >
        Review
      </Button>
    </NotificationRow>
  )
}

function OtherActions({
  item,
  onRemoveDocument,
  onRetryUpload,
  onRemoveUpload,
  removingId,
}: NotificationActions & { item: NotificationItem }) {
  if (item.stage === "upload-failed") {
    return (
      <>
        <Button
          aria-label={`Retry ${item.title}`}
          onClick={() => onRetryUpload(item.id)}
          size="icon-xs"
          variant="ghost"
        >
          <RotateCwIcon />
        </Button>
        <Button
          aria-label={`Remove ${item.title}`}
          onClick={() => onRemoveUpload(item.id)}
          size="icon-xs"
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
        size="xs"
        variant="secondary"
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
      <ul className="flex flex-col gap-0.5">
        {items.map((item) =>
          item.stage === "ready" ? (
            <ReadyRow
              item={item}
              key={item.id}
              onDiscard={actions.onDiscard}
              onReview={actions.onReview}
              removing={actions.removingId === item.id}
            />
          ) : (
            <NotificationRow item={item} key={item.id}>
              <OtherActions item={item} {...actions} />
            </NotificationRow>
          )
        )}
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
      <Empty variant="plain">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCheckIcon />
          </EmptyMedia>
          <EmptyTitle>You’re all caught up</EmptyTitle>
          <EmptyDescription>
            Bills you upload show up here while they’re read, and again when
            they need your review.
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
