import { useEffect, useRef } from "react"

type GoogleCredentialResponse = {
  credential?: string
}

type GoogleIdApi = {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
  }) => void
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: string
      size?: string
      text?: string
      width?: number
    }
  ) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } }
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client"

let gisLoad: Promise<void> | undefined

function loadGis(): Promise<void> {
  if (window.google?.accounts.id) {
    return Promise.resolve()
  }
  if (gisLoad) {
    return gisLoad
  }
  gisLoad = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = GIS_SRC
    script.async = true
    script.onload = () => {
      resolve()
    }
    script.onerror = () => {
      gisLoad = undefined
      reject(new Error("Google sign-in failed to load"))
    }
    document.head.appendChild(script)
  })
  return gisLoad
}

type GoogleSignInButtonProps = {
  onCredential: (idToken: string) => void
  disabled?: boolean
}

export function GoogleSignInButton({
  onCredential,
  disabled,
}: GoogleSignInButtonProps) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const hostRef = useRef<HTMLDivElement>(null)
  const onCredentialRef = useRef(onCredential)

  useEffect(() => {
    onCredentialRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (!clientId || !hostRef.current) {
      return
    }
    let cancelled = false
    let resizeObserver: ResizeObserver | undefined
    const host = hostRef.current
    loadGis()
      .then(() => {
        if (cancelled || !window.google) {
          return
        }
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              onCredentialRef.current(response.credential)
            }
          },
        })
        let previousWidth = 0
        const render = () => {
          const width = Math.min(352, Math.floor(host.clientWidth))
          if (!width || width === previousWidth) return
          previousWidth = width
          host.replaceChildren()
          window.google?.accounts.id.renderButton(host, {
            theme: "filled_black",
            size: "large",
            text: "continue_with",
            width,
          })
        }
        render()
        resizeObserver = new ResizeObserver(render)
        resizeObserver.observe(host)
      })
      .catch(() => {
        // ponytail: GIS load failure surfaces as a missing button
      })
    return () => {
      cancelled = true
      resizeObserver?.disconnect()
    }
  }, [clientId])

  if (!clientId) {
    return null
  }

  return (
    <div
      aria-busy={disabled}
      className={
        disabled
          ? "pointer-events-none w-full min-w-0 opacity-50"
          : "w-full min-w-0"
      }
      ref={hostRef}
    />
  )
}
