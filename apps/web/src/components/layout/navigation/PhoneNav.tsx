import { Popover } from "@base-ui/react/popover"
import {
  CameraIcon,
  ChartNoAxesCombinedIcon,
  CircleUserIcon,
  LayoutGridIcon,
  MessageCircleIcon,
  ReceiptTextIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"
import { useRef, useState, type CSSProperties } from "react"
import { Link, useLocation, useNavigate } from "react-router"

import { PhoneAccountSheet } from "@/components/layout/navigation/PhoneAccountSheet"
import { Button } from "@/components/ui/button"
import { useChatScans } from "@/hooks/agent/use-chat-scans"
import { useReviewCount } from "@/hooks/documents/use-review-count"
import { useGetMe } from "@/hooks/users/use-me"
import { cn } from "@/lib/utils"

/** Rows from the top; the last one sits nearest the button and rises first. */
const ROW_COUNT = 5

type Placement = "floating" | "inline"

type RowContentProps = {
  icon: LucideIcon
  label: string
  current?: boolean
  large?: boolean
}

function RowContent({ icon: Icon, label, current, large }: RowContentProps) {
  return (
    <>
      <span className="rounded-[10px] glass-strong px-3 py-1.5 text-sm font-medium text-foreground">
        {label}
      </span>
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-[14px] transition-shadow group-focus-visible/row:ring-3 group-focus-visible/row:ring-ring/50",
          large ? "size-12" : "size-11",
          current
            ? "bg-primary text-primary-foreground shadow-(--glass-shadow)"
            : "glass-strong text-foreground"
        )}
      >
        <Icon aria-hidden className="size-5" />
      </span>
    </>
  )
}

const LINKS = [
  {
    to: "/chat",
    label: "Chat",
    icon: MessageCircleIcon,
    isCurrent: (pathname: string) => pathname === "/chat",
  },
  {
    to: "/spending/bills",
    label: "Bills",
    icon: ReceiptTextIcon,
    isCurrent: (pathname: string) =>
      pathname === "/spending/bills" || pathname === "/spending/items",
  },
  {
    to: "/spending/analytics",
    label: "Insights",
    icon: ChartNoAxesCombinedIcon,
    isCurrent: (pathname: string) => pathname === "/spending/analytics",
  },
]

type StackLinkProps = Omit<RowContentProps, "current"> & {
  to: string
  current: boolean
  className: string
  style: CSSProperties
  onNavigate: () => void
}

function StackLink({
  to,
  current,
  className,
  style,
  onNavigate,
  ...content
}: StackLinkProps) {
  return (
    <Link
      aria-current={current ? "page" : undefined}
      className={className}
      onClick={onNavigate}
      style={style}
      to={to}
    >
      <RowContent current={current} {...content} />
    </Link>
  )
}

/** Rises from the button: the row nearest it (the last) moves first. */
function rowStyle(index: number) {
  return { "--stagger": `${(ROW_COUNT - 1 - index) * 30}ms` } as CSSProperties
}

function rowClassName(placement: Placement) {
  return cn(
    "group/row flex min-h-11 items-center gap-2.5 outline-none",
    // Labels sit on the inner side of the screen.
    placement === "inline" && "flex-row-reverse",
    "transition-[opacity,translate,scale] delay-(--stagger) duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-data-ending-style/stack:translate-y-3 group-data-ending-style/stack:scale-96 group-data-ending-style/stack:opacity-0 group-data-ending-style/stack:delay-0 group-data-starting-style/stack:translate-y-3 group-data-starting-style/stack:scale-96 group-data-starting-style/stack:opacity-0 motion-reduce:transition-none"
  )
}

type PhoneNavProps = {
  /** `floating`: bottom-right over the page. `inline`: in the chat composer row. */
  placement: Placement
}

/**
 * Phone navigation: one button that opens a Stack menu of Scan a bill, Chat,
 * Bills, Insights and You. It replaced the bottom tab bar.
 */
export function PhoneNav({ placement }: PhoneNavProps) {
  const me = useGetMe()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const scans = useChatScans()
  const toReview = useReviewCount()
  const camera = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  if (!me.data) return null

  const reviewLabel = toReview
    ? `, ${toReview} bill${toReview === 1 ? "" : "s"} to review`
    : ""
  const rows = rowClassName(placement)

  return (
    <>
      <Popover.Root onOpenChange={setOpen} open={open}>
        <Popover.Trigger
          render={
            <Button
              aria-label={`Menu${reviewLabel}`}
              className={cn(
                "shadow-(--glass-shadow-lg)",
                placement === "floating"
                  ? "fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))]"
                  : "relative",
                // Under dialogs while closed; over its own scrim while open.
                open ? "z-[60]" : "z-30"
              )}
              size="icon-fab"
            />
          }
        >
          {open ? (
            <XIcon className="animate-in duration-200 spin-in-90 motion-reduce:animate-none" />
          ) : (
            <LayoutGridIcon />
          )}
          {toReview && !open ? (
            <span
              aria-hidden
              className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-background px-1 text-[10.5px] font-semibold text-foreground tabular-nums ring-[1.5px] ring-primary"
            >
              {toReview}
            </span>
          ) : null}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Backdrop className="fixed inset-0 z-50 bg-(--scrim) backdrop-blur-sm transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
          <Popover.Positioner
            align={placement === "floating" ? "end" : "start"}
            className="z-[55]"
            side="top"
            sideOffset={12}
          >
            <Popover.Popup
              aria-label="Main menu"
              className="group/stack transition-opacity duration-200 outline-none data-ending-style:opacity-0 motion-reduce:transition-none"
            >
              <nav aria-label="Main">
                <ul
                  className={cn(
                    "flex flex-col gap-2.5",
                    placement === "floating" ? "items-end" : "items-start"
                  )}
                >
                  <li>
                    <button
                      className={rows}
                      onClick={() => {
                        setOpen(false)
                        camera.current?.click()
                      }}
                      style={rowStyle(0)}
                      type="button"
                    >
                      <RowContent icon={CameraIcon} label="Scan a bill" large />
                    </button>
                  </li>
                  {LINKS.map((link, index) => (
                    <li key={link.to}>
                      <StackLink
                        {...link}
                        className={rows}
                        current={link.isCurrent(pathname)}
                        onNavigate={() => setOpen(false)}
                        style={rowStyle(index + 1)}
                      />
                    </li>
                  ))}
                  <li>
                    <button
                      aria-haspopup="dialog"
                      className={rows}
                      onClick={() => {
                        setOpen(false)
                        setAccountOpen(true)
                      }}
                      style={rowStyle(4)}
                      type="button"
                    >
                      <RowContent icon={CircleUserIcon} label="You" />
                    </button>
                  </li>
                </ul>
              </nav>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {/* Outside the popup, so it outlives the menu closing. */}
      <input
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const files = event.currentTarget.files
          if (files?.length) {
            void scans.add(files)
            if (pathname !== "/chat") navigate("/chat")
          }
          event.currentTarget.value = ""
        }}
        ref={camera}
        type="file"
      />
      <PhoneAccountSheet
        onOpenChange={setAccountOpen}
        open={accountOpen}
        user={me.data}
      />
    </>
  )
}
