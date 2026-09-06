import { useEffect, useState } from "react"
import { useInView, useReducedMotion } from "framer-motion"
import { useAnimate } from "framer-motion/mini"
import { Pause, Play } from "lucide-react"

import { Button } from "@/components/ui/button"

export function AuthPanel() {
  const [scope, animate] = useAnimate()
  const inView = useInView(scope)
  const reduceMotion = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const updateVisibility = () => setVisible(!document.hidden)
    updateVisibility()
    document.addEventListener("visibilitychange", updateVisibility)
    return () =>
      document.removeEventListener("visibilitychange", updateVisibility)
  }, [])

  useEffect(() => {
    if (!inView || !visible || paused || reduceMotion) return
    const animation = animate(
      "svg",
      {
        transform: [
          "translate(0px, 0px) rotate(0deg)",
          "translate(-18px, 14px) rotate(-2deg)",
          "translate(0px, 0px) rotate(0deg)",
        ],
      },
      { duration: 28, repeat: Infinity, ease: "easeInOut" }
    )
    return () => animation.stop()
  }, [animate, inView, paused, reduceMotion, visible])

  return (
    <aside className="relative isolate hidden min-h-svh overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div
        ref={scope}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-linear-to-br from-primary via-primary to-ring/30" />
        <svg
          className="absolute inset-0 size-full text-primary-foreground/12"
          viewBox="0 0 700 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          {Array.from({ length: 18 }, (_, index) => (
            <path
              key={index}
              d={`M -180 ${460 + index * 22} C 90 ${690 + index * 18}, 190 ${130 + index * 22}, 880 ${300 + index * 22}`}
              stroke="currentColor"
              strokeWidth="0.7"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      <div className="relative max-w-md pt-8 xl:pt-12">
        <h2 className="text-5xl leading-[1.12] font-light tracking-[-0.035em] text-balance xl:text-6xl">
          A little clarity.
          <br />
          Every day.
        </h2>
        <p className="mt-6 max-w-64 text-base leading-relaxed font-light text-primary-foreground/75">
          A place for the little things.
          <br />A clearer view of the whole.
        </p>
      </div>
      <div className="relative mt-16 flex items-end justify-between gap-6">
        <p className="max-w-56 text-sm leading-relaxed font-normal text-primary-foreground/65">
          Your spending, in perspective.
        </p>
        {!reduceMotion && (
          <Button
            aria-label={
              paused
                ? "Play background animation"
                : "Pause background animation"
            }
            aria-pressed={paused}
            className="size-11 shrink-0 rounded-full text-primary-foreground/70 hover:bg-primary-foreground/5 hover:text-primary-foreground focus-visible:ring-primary-foreground/50"
            onClick={() => setPaused((current) => !current)}
            size="icon"
            type="button"
            variant="ghost"
          >
            {paused ? (
              <Play className="size-3.5" strokeWidth={1.5} />
            ) : (
              <Pause className="size-3.5" strokeWidth={1.5} />
            )}
          </Button>
        )}
      </div>
    </aside>
  )
}
