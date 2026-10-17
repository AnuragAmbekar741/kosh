import { FileTextIcon } from "lucide-react"

import { useChatScans } from "@/hooks/agent/use-chat-scans"

type AgentAttachmentsProps = {
  documentIds: string[]
}

/**
 * Bills on a user message: the photo while this session still has it, a file
 * tile otherwise (after a reload, or for PDFs).
 */
export function AgentAttachments({ documentIds }: AgentAttachmentsProps) {
  const { previews } = useChatScans()

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {documentIds.map((id) => {
        const preview = previews[id]
        return preview ? (
          <img
            alt="Attached bill"
            className="h-24 w-18 rounded-lg object-cover ring-1 ring-border"
            key={id}
            src={preview}
          />
        ) : (
          <span
            aria-label="Attached bill"
            className="flex h-24 w-18 items-center justify-center rounded-lg glass text-muted-foreground"
            key={id}
          >
            <FileTextIcon className="size-5" />
          </span>
        )
      })}
    </div>
  )
}
