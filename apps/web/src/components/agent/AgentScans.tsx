import { CircleAlertIcon, FileTextIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import { MessageScrollerItem } from "@/components/ui/message-scroller"
import {
  type ChatScan,
  type ScanPage,
  useChatScans,
} from "@/hooks/agent/use-chat-scans"
import { useUploads } from "@/hooks/documents/use-uploads"

type PageStatusProps = {
  page: ScanPage
}

/** A photo before it reaches the agent: uploading, or failed with Retry. */
function PageStatus({ page }: PageStatusProps) {
  const uploads = useUploads()
  const upload = uploads.uploads.find((item) => item.key === page.key)

  if (upload?.status === "failed") {
    return (
      <Marker>
        <MarkerIcon>
          <CircleAlertIcon />
        </MarkerIcon>
        <MarkerContent>
          {page.name}: {upload.error}
        </MarkerContent>
        <Button
          className="ml-auto"
          onClick={() => uploads.retry(page.key)}
          size="xs"
          variant="ghost"
        >
          Retry
        </Button>
      </Marker>
    )
  }
  return (
    <Marker aria-live="polite">
      <MarkerContent className="shimmer">
        {uploads.accepted[page.key]
          ? `Sending ${page.name}…`
          : `Uploading ${page.name}…`}
      </MarkerContent>
    </Marker>
  )
}

type ScanItemProps = {
  scan: ChatScan
}

function ScanItem({ scan }: ScanItemProps) {
  return (
    <MessageScrollerItem messageId={scan.id} scrollAnchor>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap justify-end gap-2">
          {scan.pages.map((page) =>
            page.preview ? (
              <img
                alt={page.name}
                className="h-24 w-18 rounded-lg object-cover ring-1 ring-border"
                key={page.key}
                src={page.preview}
              />
            ) : (
              <span
                aria-label={page.name}
                className="flex h-24 w-18 items-center justify-center rounded-lg glass text-muted-foreground"
                key={page.key}
              >
                <FileTextIcon className="size-5" />
              </span>
            )
          )}
        </div>
        {scan.pages.map((page) => (
          <PageStatus key={page.key} page={page} />
        ))}
      </div>
    </MessageScrollerItem>
  )
}

/**
 * Photos still uploading from the phone chat, after the conversation. Once
 * uploaded they're sent as a message, and the thread takes over from there.
 */
export function AgentScans() {
  const { scans } = useChatScans()

  return scans.map((scan) => <ScanItem key={scan.id} scan={scan} />)
}
