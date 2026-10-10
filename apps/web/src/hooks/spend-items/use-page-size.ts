import { useSyncExternalStore } from "react"

// Tailwind's `2xl` breakpoint: 1536px and wider get the taller page.
const WIDE_QUERY = "(min-width: 1536px)"

export const PAGE_SIZE_DEFAULT = 15
export const PAGE_SIZE_WIDE = 20

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(WIDE_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

/** Rows per page on the Items table: 20 on 2xl screens, 15 elsewhere. */
export function usePageSize(): number {
  return useSyncExternalStore(
    subscribe,
    () =>
      window.matchMedia(WIDE_QUERY).matches
        ? PAGE_SIZE_WIDE
        : PAGE_SIZE_DEFAULT,
    () => PAGE_SIZE_DEFAULT
  )
}
