import { PaperclipIcon } from "lucide-react"
import { useRef } from "react"

import { InputGroupButton } from "@/components/ui/input-group"
import { useChatScans } from "@/hooks/agent/use-chat-scans"

const ACCEPTED = "image/*,.heic,.heif,application/pdf"

/**
 * Phone composer: up to five photos or PDFs, sent at once; each file becomes
 * its own bill. The camera is Scan a bill in the nav menu beside it.
 */
export function AgentAttachButton() {
  const scans = useChatScans()
  const gallery = useRef<HTMLInputElement>(null)

  return (
    <>
      <InputGroupButton
        aria-label="Add photos"
        className="text-muted-foreground"
        onClick={() => gallery.current?.click()}
        size="icon-round"
      >
        <PaperclipIcon />
      </InputGroupButton>
      <input
        accept={ACCEPTED}
        className="hidden"
        multiple
        onChange={(event) => {
          const files = event.currentTarget.files
          if (files?.length) void scans.add(files)
          event.currentTarget.value = ""
        }}
        ref={gallery}
        type="file"
      />
    </>
  )
}
