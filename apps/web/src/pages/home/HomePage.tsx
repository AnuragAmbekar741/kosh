import { Navigate, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { useLogout } from "@/hooks/auth/use-auth"
import { useGetMe } from "@/hooks/users/use-me"

export function HomePage() {
  const me = useGetMe()
  const logout = useLogout()
  const navigate = useNavigate()

  if (me.isPending) {
    return (
      <p className="p-6 text-sm text-muted-foreground">Loading…</p>
    )
  }
  if (!me.data) {
    return <Navigate replace to="/login" />
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <p className="text-sm">{me.data.email}</p>
      <Button
        disabled={logout.isPending}
        onClick={() => {
          logout.mutate(undefined, {
            onSuccess: () => navigate("/login"),
          })
        }}
      >
        Log out
      </Button>
    </div>
  )
}
