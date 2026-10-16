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
import { AGENT_PANEL_ID, useAgentPanel } from "@/hooks/agent/use-agent-panel"

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
  onSelect: () => void
}

function RouteTab({ to, active, onSelect, ...content }: RouteTabProps) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={tabClassName}
      onClick={onSelect}
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
  const agent = useAgentPanel()
  const [accountOpen, setAccountOpen] = useState(false)
  const onRoute = !agent.open && !accountOpen

  return (
    <nav
      aria-label="Main"
      className="flex h-(--phone-tab-bar) shrink-0 items-stretch border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <button
        aria-controls={AGENT_PANEL_ID}
        aria-expanded={agent.open}
        className={tabClassName}
        onClick={() => agent.setOpen(!agent.open)}
        type="button"
      >
        <TabContent icon={MessageCircleIcon} label="Chat" />
      </button>
      <RouteTab
        active={
          onRoute &&
          (pathname === "/spending/bills" || pathname === "/spending/items")
        }
        icon={ReceiptTextIcon}
        label="Bills"
        onSelect={() => agent.setOpen(false)}
        to="/spending/bills"
      />
      <RouteTab
        active={onRoute && pathname === "/spending/analytics"}
        icon={ChartNoAxesCombinedIcon}
        label="Insights"
        onSelect={() => agent.setOpen(false)}
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
