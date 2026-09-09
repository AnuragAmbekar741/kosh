import type { FormEventHandler, ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { Wallet } from "lucide-react"
import { Link } from "react-router"

import { AuthPanel } from "@/components/auth/AuthPanel"
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { ContourField } from "@/components/visuals/ContourField"

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
  const reduceMotion = useReducedMotion()
  const formItem = {
    hidden: { filter: "blur(8px)", opacity: 0, y: -18 },
    visible: {
      filter: "blur(0px)",
      opacity: 1,
      transition: {
        duration: reduceMotion ? 0 : 0.48,
        ease: [0.22, 1, 0.36, 1] as const,
      },
      y: 0,
    },
  }

  return (
    <div className="group/auth relative isolate grid min-h-dvh overflow-hidden bg-[image:var(--auth-page-background)] lg:h-dvh lg:grid-cols-[56%_44%]">
      <ContourField className="z-0 opacity-70 transition-opacity duration-700 group-hover/auth:opacity-100" />
      <div className="relative z-10 flex min-h-dvh min-w-0 flex-col px-6 py-4 sm:px-8 md:px-12 md:py-5 lg:order-2 lg:min-h-0 lg:overflow-y-auto lg:py-3 xl:px-16">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="size-5" strokeWidth={1.5} />
            </span>
            <span className="text-sm font-light tracking-wide">Finance</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-light text-muted-foreground sm:inline">
              {switchHint}
            </span>
            <Button
              className="min-h-11 px-4 font-light"
              nativeButton={false}
              render={<Link to={switchTo} />}
              variant="outline"
            >
              {switchLabel}
            </Button>
          </div>
        </header>
        <motion.main
          animate="visible"
          className="flex flex-1 flex-col items-center justify-center py-6 md:py-8 lg:py-0 xl:py-8"
          initial={reduceMotion ? false : "hidden"}
          variants={{
            hidden: {},
            visible: {
              transition: {
                delayChildren: 0.04,
                staggerChildren: reduceMotion ? 0 : 0.08,
              },
            },
          }}
        >
          <div className="flex w-full max-w-sm min-w-0 flex-col items-center gap-5 xl:gap-6">
            <motion.div
              className="flex flex-col items-center gap-4 text-center"
              variants={formItem}
            >
              <span className="flex size-11 items-center justify-center rounded-xl border border-border">
                <Icon className="size-5" strokeWidth={1.25} />
              </span>
              <div className="flex flex-col gap-1.5">
                <h1 className="text-3xl font-light tracking-tight">{title}</h1>
                <p className="text-sm font-light text-muted-foreground">
                  {description}
                </p>
              </div>
            </motion.div>
            <motion.form
              className="flex w-full flex-col gap-5 [&_[data-slot=input-group]]:h-11 [&_button]:font-light [&_input]:min-h-11 [&_label]:font-light"
              noValidate
              onSubmit={onSubmit}
              variants={formItem}
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
            </motion.form>
            {googleClientId && onGoogleCredential ? (
              <motion.div
                className="flex w-full flex-col gap-5"
                variants={formItem}
              >
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-sm text-muted-foreground">or</span>
                  <Separator className="flex-1" />
                </div>
                <GoogleSignInButton
                  disabled={pending}
                  onCredential={onGoogleCredential}
                />
              </motion.div>
            ) : null}
          </div>
        </motion.main>
        <p className="text-xs font-light text-muted-foreground">
          © 2026 Finance
        </p>
      </div>
      <AuthPanel />
    </div>
  )
}
