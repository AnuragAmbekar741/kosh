import { motion } from "framer-motion"
import { LogOut, ReceiptText, ScanLine } from "lucide-react"
import { NavLink, Navigate, Outlet, useNavigate } from "react-router"

import { FinanceMark } from "@/components/auth/FinanceMark"
import { Button } from "@/components/ui/button"
import { useLogout } from "@/hooks/auth/use-auth"
import { useGetMe } from "@/hooks/users/use-me"
import { cn } from "@/lib/utils"

const destinations = [
  { label: "Upload", to: "/", icon: ScanLine },
  { label: "Payments", to: "/payments", icon: ReceiptText },
]

export function ApplicationShell() {
  const me = useGetMe()
  const logout = useLogout()
  const navigate = useNavigate()

  if (me.isPending) {
    return (
      <div className="grid min-h-svh place-items-center bg-document-canvas text-sm text-muted-foreground">
        Opening your workspace…
      </div>
    )
  }
  if (!me.data) return <Navigate replace to="/login" />

  const displayName = me.data.name || me.data.email
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

  return (
    <div className="min-h-svh bg-document-canvas">
      <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center">
          <FinanceMark className="justify-self-start [&>span:last-child]:hidden sm:[&>span:last-child]:inline" />

          <nav
            aria-label="Primary navigation"
            className="flex items-center rounded-xl border border-border/80 bg-card/90 p-1 shadow-sm backdrop-blur-sm"
          >
            {destinations.map(({ icon: Icon, label, to }) => (
              <NavLink
                className="relative flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:px-4 sm:text-sm"
                end={to === "/"}
                key={to}
                to={to}
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <motion.span
                        className="absolute inset-0 rounded-lg bg-primary"
                        layoutId="active-destination"
                        transition={{
                          duration: 0.22,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      />
                    ) : null}
                    <Icon
                      className={cn(
                        "relative size-3.5",
                        isActive && "text-primary-foreground"
                      )}
                      strokeWidth={1.7}
                    />
                    <span
                      className={cn(
                        "relative",
                        isActive && "text-primary-foreground"
                      )}
                    >
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 justify-self-end sm:gap-2">
            <span
              aria-label={`Signed in as ${displayName}`}
              className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-[11px] font-medium"
              title={displayName}
            >
              {initials}
            </span>
            <Button
              aria-label="Log out"
              disabled={logout.isPending}
              onClick={() => {
                logout.mutate(undefined, {
                  onSuccess: () => navigate("/login"),
                })
              }}
              size="icon-sm"
              title="Log out"
              variant="ghost"
            >
              <LogOut />
            </Button>
          </div>
        </header>

        <Outlet />

        <footer className="py-2 text-center text-xs text-muted-foreground">
          Your documents stay private to your account.
        </footer>
      </div>
    </div>
  )
}
