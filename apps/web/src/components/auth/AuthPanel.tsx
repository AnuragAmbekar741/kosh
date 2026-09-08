import { motion, useReducedMotion } from "framer-motion"

const contourLines = Array.from({ length: 18 }, (_, index) => ({
  id: `contour-${index}`,
  d: `M -160 ${410 + index * 24} C ${80 - index * 2} ${700 + index * 5}, ${250 + index * 4} ${140 + index * 17}, ${500 + index * 3} ${370 + index * 11} S ${720 - index * 4} ${690 - index * 9}, 960 ${440 - index * 5}`,
}))

export function AuthPanel() {
  const reduceMotion = useReducedMotion()

  return (
    <aside className="relative isolate hidden min-h-svh overflow-hidden bg-primary bg-[image:var(--primary-gradient)] text-slate-950 lg:flex lg:min-h-0 lg:flex-col lg:p-10 xl:p-20">
      <div className="relative z-10 max-w-xl">
        <p className="mb-6 text-xs font-medium tracking-[0.18em] text-slate-600 uppercase">
          Personal finance, made clear
        </p>
        <h2 className="text-[clamp(3.25rem,5vw,5.75rem)] leading-[0.94] font-light tracking-[-0.045em] whitespace-nowrap">
          Know your money.
        </h2>
        <p className="mt-7 max-w-md text-base leading-relaxed text-slate-600">
          Understand where your money goes, spot the patterns that matter, and
          make calmer decisions every day.
        </p>
      </div>

      <motion.div
        aria-hidden="true"
        animate={
          reduceMotion
            ? undefined
            : {
                x: [0, -12, 8, 0],
                y: [0, 10, -6, 0],
                rotate: [0, -1.5, 1, 0],
                scale: [1, 1.025, 0.99, 1],
              }
        }
        className="pointer-events-none absolute -inset-16 -z-10 origin-center"
        transition={{ duration: 28, ease: "easeInOut", repeat: Infinity }}
      >
        <svg
          className="size-full"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 800 800"
        >
          <defs>
            <linearGradient
              id="auth-line-gradient"
              gradientUnits="userSpaceOnUse"
              x1="80"
              x2="760"
              y1="240"
              y2="640"
            >
              <stop stopColor="var(--auth-panel-line-start)" />
              <stop offset="0.52" stopColor="var(--auth-panel-line-mid)" />
              <stop offset="1" stopColor="var(--auth-panel-line-end)" />
            </linearGradient>
          </defs>
          {contourLines.map((line) => (
            <path
              key={line.id}
              d={line.d}
              stroke="url(#auth-line-gradient)"
              strokeOpacity="0.48"
              strokeWidth="1.1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </motion.div>
    </aside>
  )
}
