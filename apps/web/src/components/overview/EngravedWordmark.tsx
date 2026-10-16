import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import {
  motion,
  useAnimationFrame,
  useReducedMotion,
  type Variants,
} from "framer-motion"

import { STARTER_COPY } from "@/components/overview/overview-copy"

const RING_COUNT = 64
const RING_STEPS = 72
const EASE = [0.2, 0.8, 0.2, 1] as const
/** Breathe starts once the outline has drawn in. */
const BREATHE_DELAY = 1600
const FRAME_MS = 33
const PHASE_STEP = 0.035

const ringIds = Array.from({ length: RING_COUNT }, (_, index) => `r${index}`)

type Point = { x: number; y: number }
type Fit = { viewBox: string; aspectRatio: string; center: Point }

const DEFAULT_FIT: Fit = {
  viewBox: "0 0 300 100",
  aspectRatio: "300 / 100",
  center: { x: 150, y: 54 },
}

function ringPath(index: number, center: Point, phase: number) {
  let d = ""
  for (let k = 0; k <= RING_STEPS; k++) {
    const t = (k / RING_STEPS) * Math.PI * 2
    const r =
      3 +
      2.5 * index +
      Math.sin(3 * t + 0.3 * index + phase) * 1.4 +
      Math.cos(5 * t - 0.2 * index - 0.7 * phase) * 0.8
    const x = center.x + Math.cos(t) * r * 1.6
    const y = center.y + Math.sin(t) * r
    d += `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return `${d}Z`
}

const ringVariants: Variants = {
  hidden: { opacity: 0 },
  shown: (index: number) => ({
    opacity: 1,
    transition: {
      delay: 0.35 + index * 0.016,
      duration: 0.45,
      ease: "easeOut",
    },
  }),
}

const outlineVariants: Variants = {
  hidden: { strokeDashoffset: 360 },
  shown: { strokeDashoffset: 0, transition: { duration: 1.6, ease: EASE } },
}

const meaningVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.9, duration: 0.6, ease: EASE },
  },
}

function Glyphs(props: React.ComponentProps<"text">) {
  return (
    <text
      fontFamily="Geist Variable, Geist, sans-serif"
      fontSize="104"
      fontWeight="640"
      letterSpacing="-5"
      x="0"
      y="84"
      {...props}
    >
      Kosh
    </text>
  )
}

/**
 * "Kosh" engraved: contour rings clipped to the glyphs under a drawn outline.
 * Plays an entrance once, then the rings breathe. Still under reduced motion.
 */
export function EngravedWordmark() {
  const reduceMotion = useReducedMotion()
  const clipId = `kosh-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`
  const outlineRef = useRef<SVGTextElement>(null)
  const ringRefs = useRef<(SVGPathElement | null)[]>([])
  const phase = useRef(0)
  const lastFrame = useRef(0)
  const readyAt = useRef<number | null>(null)
  const [fit, setFit] = useState<Fit | null>(null)

  // Fit the viewBox to the glyphs once Geist has loaded.
  useEffect(() => {
    let cancelled = false
    document.fonts.ready.then(() => {
      const outline = outlineRef.current
      if (cancelled || !outline) return
      const bb = outline.getBBox()
      setFit({
        viewBox: `${bb.x - 1} ${bb.y + 6} ${bb.width + 2} ${bb.height - 10}`,
        aspectRatio: `${bb.width + 2} / ${bb.height - 10}`,
        center: { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 + 4 },
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const center = (fit ?? DEFAULT_FIT).center

  function draw() {
    ringRefs.current.forEach((path, index) => {
      path?.setAttribute("d", ringPath(index, center, phase.current))
    })
  }

  useLayoutEffect(draw)

  // Breathe: a slow phase drift at 30fps, written straight to the paths.
  useAnimationFrame((time) => {
    if (reduceMotion || !fit) return
    readyAt.current ??= time
    if (time - readyAt.current < BREATHE_DELAY) return
    if (time - lastFrame.current < FRAME_MS) return
    lastFrame.current = time
    phase.current += PHASE_STEP
    draw()
  })

  const { viewBox, aspectRatio } = fit ?? DEFAULT_FIT
  const initial = reduceMotion ? false : "hidden"
  const animate = fit || reduceMotion ? "shown" : "hidden"

  return (
    <div className="flex flex-col gap-3.5">
      <svg
        aria-label="Kosh"
        className="-ml-[3px] block h-[clamp(84px,8.6vw,120px)] w-auto self-start overflow-visible"
        role="img"
        style={{ aspectRatio }}
        viewBox={viewBox}
      >
        <defs>
          <clipPath id={clipId}>
            <Glyphs />
          </clipPath>
        </defs>
        <g
          clipPath={`url(#${clipId})`}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="0.55"
        >
          {ringIds.map((id, index) => (
            <motion.path
              key={id}
              ref={(node) => {
                ringRefs.current[index] = node
              }}
              animate={animate}
              custom={index}
              initial={initial}
              variants={ringVariants}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
        <motion.text
          ref={outlineRef}
          animate={animate}
          fill="none"
          fontFamily="Geist Variable, Geist, sans-serif"
          fontSize="104"
          fontWeight="640"
          initial={initial}
          letterSpacing="-5"
          stroke="var(--foreground)"
          strokeDasharray="360"
          strokeOpacity="0.55"
          strokeWidth="1"
          variants={outlineVariants}
          vectorEffect="non-scaling-stroke"
          x="0"
          y="84"
        >
          Kosh
        </motion.text>
      </svg>
      <motion.p
        animate={animate}
        className="text-[15px] text-muted-foreground"
        initial={initial}
        variants={meaningVariants}
      >
        <span className="mr-2 text-foreground">
          {STARTER_COPY.pronunciation}
        </span>
        {STARTER_COPY.meaning}
      </motion.p>
    </div>
  )
}
