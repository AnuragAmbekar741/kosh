import type { FormEvent, ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Wallet } from "lucide-react"
import { Link } from "react-router"

import { AuthPanel } from "@/components/auth/AuthPanel"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type AuthShellProps = {
  title: string
  description: string
  children: ReactNode
  submitLabel: string
  icon: LucideIcon
  switchHint: string
  switchLabel: string
  switchTo: string
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" data-icon="inline-start">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function AuthShell({
  title,
  description,
  children,
  submitLabel,
  icon: Icon,
  switchHint,
  switchLabel,
  switchTo,
}: AuthShellProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-2">
      <div className="flex min-h-svh flex-col px-6 py-6 md:px-10 md:py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet />
            </span>
            <span className="text-sm font-medium">Finance</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {switchHint}
            </span>
            <Button
              nativeButton={false}
              render={<Link to={switchTo} />}
              variant="outline"
            >
              {switchLabel}
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center py-12">
          <div className="flex w-full max-w-[22rem] flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex size-11 items-center justify-center rounded-xl border border-border">
                <Icon />
              </span>
              <div className="flex flex-col gap-1.5">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {title}
                </h1>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <form className="flex w-full flex-col gap-5" onSubmit={handleSubmit}>
              {children}
              <Button className="min-h-11 w-full" type="submit">
                {submitLabel}
              </Button>
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>
              <Button className="min-h-11 w-full" type="button" variant="outline">
                <GoogleMark />
                Continue with Google
              </Button>
            </form>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 Finance</p>
      </div>
      <AuthPanel />
    </div>
  )
}
