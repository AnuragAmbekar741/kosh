import type { FormEventHandler, ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Wallet } from "lucide-react"
import { Link } from "react-router"

import { AuthPanel } from "@/components/auth/AuthPanel"
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
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
  onSubmit: FormEventHandler<HTMLFormElement>
  pending?: boolean
  formError?: string
  onGoogleCredential?: (idToken: string) => void
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
  onSubmit,
  pending,
  formError,
  onGoogleCredential,
}: AuthShellProps) {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-2">
      <div className="flex min-h-svh min-w-0 flex-col px-6 py-6 md:px-10 md:py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="size-5" strokeWidth={1.5} />
            </span>
            <span className="text-sm font-normal tracking-wide">Finance</span>
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
          <div className="flex w-full max-w-[22rem] min-w-0 flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex size-11 items-center justify-center rounded-xl border border-border">
                <Icon className="size-5" strokeWidth={1.25} />
              </span>
              <div className="flex flex-col gap-1.5">
                <h1 className="text-3xl font-light tracking-tight">{title}</h1>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <form
              className="flex w-full flex-col gap-5 [&_[data-slot=input-group]]:h-11 [&_input]:min-h-11 [&_label]:font-normal"
              noValidate
              onSubmit={onSubmit}
            >
              {children}
              {formError ? <FieldError>{formError}</FieldError> : null}
              <Button
                className="min-h-11 w-full font-normal"
                disabled={pending}
                type="submit"
              >
                {submitLabel}
              </Button>
            </form>
            {googleClientId && onGoogleCredential ? (
              <div className="flex w-full flex-col gap-5">
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-sm text-muted-foreground">or</span>
                  <Separator className="flex-1" />
                </div>
                <GoogleSignInButton
                  disabled={pending}
                  onCredential={onGoogleCredential}
                />
              </div>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 Finance</p>
      </div>
      <AuthPanel />
    </div>
  )
}
