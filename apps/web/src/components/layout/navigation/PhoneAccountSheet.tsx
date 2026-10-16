import { LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useNavigate } from "react-router"

import type { UserPublic } from "@/api/users/users.types"
import { initialsFor } from "@/components/layout/navigation/initials"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useLogout } from "@/hooks/auth/use-auth"

const themes = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const

type Theme = (typeof themes)[number]["value"]

function isTheme(value: unknown): value is Theme {
  return themes.some((theme) => theme.value === value)
}

type PhoneAccountSheetProps = {
  user: UserPublic
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** The You tab: who is signed in, theme, and sign out. */
export function PhoneAccountSheet({
  user,
  open,
  onOpenChange,
}: PhoneAccountSheetProps) {
  const { theme, setTheme } = useTheme()
  const logout = useLogout()
  const navigate = useNavigate()
  const displayName = user.name || user.email

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="gap-0 rounded-t-xl pb-[calc(1rem+env(safe-area-inset-bottom))]"
        side="bottom"
      >
        <SheetHeader className="flex-row items-center gap-3 p-4 pr-14">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-medium text-accent-foreground"
          >
            {initialsFor(user.name, user.email)}
          </span>
          <span className="grid min-w-0 flex-1">
            <SheetTitle className="truncate">{displayName}</SheetTitle>
            <SheetDescription className="truncate">
              {user.email}
            </SheetDescription>
          </span>
          {/* Up here, not at the bottom: a double tap on the You tab lands there. */}
          <Button
            className="ml-auto shrink-0"
            disabled={logout.isPending}
            onClick={() => {
              logout.mutate(undefined, {
                onSuccess: () => navigate("/login"),
              })
            }}
            size="sm"
            variant="destructive"
          >
            <LogOutIcon />
            {logout.isPending ? "Signing out…" : "Sign out"}
          </Button>
        </SheetHeader>
        <div className="grid gap-2 border-t border-border px-4 py-4">
          <span className="text-sm text-muted-foreground" id="phone-theme">
            Theme
          </span>
          <ToggleGroup
            aria-labelledby="phone-theme"
            className="w-full"
            onValueChange={(value) => {
              const [next] = value
              if (isTheme(next)) setTheme(next)
            }}
            value={[theme]}
            variant="outline"
          >
            {themes.map(({ value, label, icon: Icon }) => (
              <ToggleGroupItem className="flex-1" key={value} value={value}>
                <Icon />
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </SheetContent>
    </Sheet>
  )
}
