import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"

const CENTER = { x: 1060, y: 170 }
const STEPS = 96

function ringPath(index: number) {
  let d = ""
  for (let k = 0; k <= STEPS; k++) {
    const t = (k / STEPS) * Math.PI * 2
    const r =
      60 +
      34 * index +
      Math.sin(3 * t + 0.45 * index) * (6 + 0.9 * index) +
      Math.cos(5 * t - 0.3 * index) * (3 + 0.4 * index)
    const x = CENTER.x + Math.cos(t) * r * 1.25
    const y = CENTER.y + Math.sin(t) * r
    d += `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return `${d}Z`
}

const rings = Array.from({ length: 16 }, (_, index) => ({
  d: ringPath(index),
  id: `ring-${index}`,
  opacity: 0.8 - 0.03 * index,
}))

type ContourRingsProps = {
  className?: string
}

/**
 * Faint concentric rings in the top-right, drifting like `ContourField`.
 * Decorative only; place it in a `relative overflow-hidden` container.
 */
export function ContourRings({ className }: ContourRingsProps) {
  const reduceMotion = useReducedMotion()

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -inset-10 mask-[radial-gradient(60%_75%_at_80%_28%,black_10%,transparent_75%)]",
        className
      )}
    >
      <motion.svg
        animate={
          reduceMotion
            ? undefined
            : {
                rotate: [0, -0.6, 0.4, 0],
                x: [0, -12, 8, 0],
                y: [0, 10, -6, 0],
              }
        }
        className="size-full origin-center will-change-transform"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        transition={{ duration: 26, ease: "easeInOut", repeat: Infinity }}
        viewBox="0 0 1200 720"
      >
        {rings.map((ring) => (
          <path
            key={ring.id}
            d={ring.d}
            stroke="var(--auth-line-mid)"
            strokeOpacity={ring.opacity}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </motion.svg>
    </div>
  )
}
