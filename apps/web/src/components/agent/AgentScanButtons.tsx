import { CameraIcon, ImageIcon } from "lucide-react"
import { useRef } from "react"

import { Button } from "@/components/ui/button"
import { useChatScans } from "@/hooks/agent/use-chat-scans"

const ACCEPTED = "image/*,.heic,.heif,application/pdf"

type AgentScanButtonsProps = {
  /** Runs after files are queued, e.g. to move to the chat. */
  onAdded?: () => void
}

/**
 * Camera opens the phone's own camera (`capture`); Gallery picks up to five
 * photos or PDFs. Both send at once: each file becomes its own bill.
 */
export function AgentScanButtons({ onAdded }: AgentScanButtonsProps) {
  const scans = useChatScans()
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)

  function choose(input: HTMLInputElement) {
    const files = input.files
    if (files?.length) {
      void scans.add(files)
      onAdded?.()
    }
    input.value = ""
  }

  return (
    <>
      <Button
        aria-label="Scan a bill"
        onClick={() => camera.current?.click()}
        size="icon"
        type="button"
        variant="secondary"
      >
        <CameraIcon />
      </Button>
      <Button
        aria-label="Add photos"
        onClick={() => gallery.current?.click()}
        size="icon"
        type="button"
        variant="secondary"
      >
        <ImageIcon />
      </Button>
      <input
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => choose(event.currentTarget)}
        ref={camera}
        type="file"
      />
      <input
        accept={ACCEPTED}
        className="hidden"
        multiple
        onChange={(event) => choose(event.currentTarget)}
        ref={gallery}
        type="file"
      />
    </>
  )
}
