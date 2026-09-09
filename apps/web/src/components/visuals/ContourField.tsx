import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"

const flowLines = Array.from({ length: 17 }, (_, index) => {
  const offset = index * 25

  return {
    d: `M -180 ${500 + offset} C ${70 - index * 3} ${805 + index * 5}, ${360 + index * 4} ${125 + index * 12}, ${700 + index * 4} ${410 + index * 9} S ${1120 - index * 3} ${790 - index * 8}, 1620 ${400 - index * 4}`,
    id: `flow-${index}`,
    opacity: 0.26 + index * 0.018,
  }
})

type ContourFieldProps = {
  className?: string
  opacity?: number
}

export function ContourField({ className, opacity = 0.82 }: ContourFieldProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      aria-hidden="true"
      animate={
        reduceMotion
          ? undefined
          : {
              rotate: [0, -0.65, 0.45, 0],
              scale: [1, 1.018, 0.997, 1],
              x: [0, -12, 8, 0],
              y: [0, 10, -6, 0],
            }
      }
      className={cn(
        "pointer-events-none absolute -inset-16 origin-center will-change-transform",
        className
      )}
      transition={{ duration: 26, ease: "easeInOut", repeat: Infinity }}
    >
      <svg
        className="size-full"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 900"
      >
        <defs>
          <linearGradient
            id="flow-line-gradient"
            gradientUnits="userSpaceOnUse"
            x1="0"
            x2="1440"
            y1="450"
            y2="450"
          >
            <stop stopColor="var(--auth-line-start)" stopOpacity="0.78" />
            <stop
              offset="0.52"
              stopColor="var(--auth-line-mid)"
              stopOpacity="0.54"
            />
            <stop
              offset="1"
              stopColor="var(--auth-line-end)"
              stopOpacity="0.18"
            />
          </linearGradient>
          <linearGradient id="flow-mask-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="black" />
            <stop offset="0.16" stopColor="white" />
            <stop offset="0.84" stopColor="white" />
            <stop offset="1" stopColor="black" />
          </linearGradient>
          <mask id="flow-mask">
            <rect width="1440" height="900" fill="url(#flow-mask-gradient)" />
          </mask>
        </defs>
        <g mask="url(#flow-mask)">
          {flowLines.map((line) => (
            <path
              key={line.id}
              d={line.d}
              stroke="url(#flow-line-gradient)"
              strokeLinecap="round"
              strokeOpacity={opacity * line.opacity}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      </svg>
    </motion.div>
  )
}
