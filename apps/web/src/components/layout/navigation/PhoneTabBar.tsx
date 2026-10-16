import {
  ChartNoAxesCombinedIcon,
  CircleUserIcon,
  MessageCircleIcon,
  ReceiptTextIcon,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { Link, useLocation } from "react-router"

import type { UserPublic } from "@/api/users/users.types"
import { PhoneAccountSheet } from "@/components/layout/navigation/PhoneAccountSheet"

const tabClassName =
  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors outline-none focus-visible:text-foreground aria-[current=page]:text-foreground aria-expanded:text-foreground"

type TabContentProps = {
  icon: LucideIcon
  label: string
}

function TabContent({ icon: Icon, label }: TabContentProps) {
  return (
    <>
      <Icon aria-hidden className="size-5" />
      <span className="truncate">{label}</span>
    </>
  )
}

type RouteTabProps = TabContentProps & {
  to: string
  active: boolean
}

function RouteTab({ to, active, ...content }: RouteTabProps) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={tabClassName}
      to={to}
    >
      <TabContent {...content} />
    </Link>
  )
}

type PhoneTabBarProps = {
  user: UserPublic
}

/** Phone navigation below 768px: Chat, Bills, Insights, You. */
export function PhoneTabBar({ user }: PhoneTabBarProps) {
  const { pathname } = useLocation()
  const [accountOpen, setAccountOpen] = useState(false)

  return (
    <nav
      aria-label="Main"
      className="flex h-(--phone-tab-bar) shrink-0 items-stretch border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <RouteTab
        active={!accountOpen && pathname === "/chat"}
        icon={MessageCircleIcon}
        label="Chat"
        to="/chat"
      />
      <RouteTab
        active={
          !accountOpen &&
          (pathname === "/spending/bills" || pathname === "/spending/items")
        }
        icon={ReceiptTextIcon}
        label="Bills"
        to="/spending/bills"
      />
      <RouteTab
        active={!accountOpen && pathname === "/spending/analytics"}
        icon={ChartNoAxesCombinedIcon}
        label="Insights"
        to="/spending/analytics"
      />
      <button
        aria-expanded={accountOpen}
        aria-haspopup="dialog"
        className={tabClassName}
        onClick={() => setAccountOpen(true)}
        type="button"
      >
        <TabContent icon={CircleUserIcon} label="You" />
      </button>
      <PhoneAccountSheet
        onOpenChange={setAccountOpen}
        open={accountOpen}
        user={user}
      />
    </nav>
  )
}
