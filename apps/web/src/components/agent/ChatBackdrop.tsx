import { ContourField } from "@/components/visuals/ContourField"
import { cn } from "@/lib/utils"

type ChatBackdropProps = {
  className?: string
}

/**
 * Depth behind the assistant: the slate mist, the login page's waveform
 * fading out at every edge, and a soft glow in the middle, all still so the
 * glass above never re-blurs while you type. Decorative only;
 * place it first in a `relative` container whose content is `relative` too.
 */
export function ChatBackdrop({ className }: ChatBackdropProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden bg-(image:--empty-wash)",
        className
      )}
    >
      <div className="absolute -inset-x-64 -inset-y-14 mask-[radial-gradient(ellipse_90%_60%_at_50%_45%,black_25%,transparent_80%)] opacity-80">
        {/* Still: the composer and cards are glass over it (see ContourField). */}
        <ContourField still />
      </div>
      <div className="absolute top-[42%] left-1/2 size-64 -translate-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--foreground)_7%,transparent),transparent_65%)] opacity-70 blur-sm" />
    </div>
  )
}
