import { CameraIcon } from "lucide-react"
import { useRef } from "react"
import { useLocation, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { CAMERA_CAPTURE, useChatScans } from "@/hooks/agent/use-chat-scans"

/**
 * Bills and Insights on phones: one tap to the camera. The photo is sent from
 * the chat, so the user lands there to follow it.
 */
export function PhoneScanButton() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const scans = useChatScans()
  const camera = useRef<HTMLInputElement>(null)

  if (!pathname.startsWith("/spending/")) return null

  return (
    <>
      <Button
        aria-label="Scan a bill"
        className="fixed right-4 bottom-[calc(var(--phone-tab-bar)+1rem)] z-30 size-14 rounded-2xl shadow-md [&_svg:not([class*='size-'])]:size-6"
        onClick={() => camera.current?.click()}
        size="icon-lg"
      >
        <CameraIcon />
      </Button>
      <input
        accept="image/*"
        capture={CAMERA_CAPTURE}
        className="hidden"
        onChange={(event) => {
          const files = event.currentTarget.files
          if (files?.length) {
            void scans.add(files)
            navigate("/chat")
          }
          event.currentTarget.value = ""
        }}
        ref={camera}
        type="file"
      />
    </>
  )
}
