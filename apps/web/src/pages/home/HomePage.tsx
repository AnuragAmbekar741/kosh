import { LogOut, Wallet } from "lucide-react"
import { Navigate, useNavigate } from "react-router"

import { DocumentUpload } from "@/components/documents/DocumentUpload"
import { Button } from "@/components/ui/button"
import { useLogout } from "@/hooks/auth/use-auth"
import { useGetMe } from "@/hooks/users/use-me"

export function HomePage() {
  const me = useGetMe()
  const logout = useLogout()
  const navigate = useNavigate()

  if (me.isPending) {
    return (
      <div className="min-h-svh bg-document-canvas p-6 text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }
  if (!me.data) {
    return <Navigate replace to="/login" />
  }

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
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="size-5" strokeWidth={1.5} />
            </span>
            <span className="text-sm font-normal">Finance</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="max-w-24 text-right sm:max-w-none">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {me.data.email}
              </p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-xs font-medium">
              {initials}
            </span>
            <Button
              aria-label="Log out"
              className="size-11"
              disabled={logout.isPending}
              onClick={() => {
                logout.mutate(undefined, {
                  onSuccess: () => navigate("/login"),
                })
              }}
              size="icon"
              title="Log out"
              variant="ghost"
            >
              <LogOut />
            </Button>
          </div>
        </header>

        <DocumentUpload />

        <footer className="text-xs text-muted-foreground">
          © 2026 Finance
        </footer>
      </div>
    </div>
  )
}
