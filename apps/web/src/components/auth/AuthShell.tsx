import type { FormEventHandler, ReactNode } from "react"
import { LayoutGroup, motion, useReducedMotion } from "framer-motion"
import { Link } from "react-router"

import { AuthPanel } from "@/components/auth/AuthPanel"
import { FinanceMark } from "@/components/auth/FinanceMark"
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton"
import { Button, buttonVariants } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { ContourField } from "@/components/visuals/ContourField"
import { cn } from "@/lib/utils"

type AuthShellProps = {
  children: ReactNode
  submitLabel: string
  mode: "login" | "signup"
  onSubmit: FormEventHandler<HTMLFormElement>
  pending?: boolean
  formError?: string
  onGoogleCredential?: (idToken: string) => void
}

export function AuthShell({
  children,
  submitLabel,
  mode,
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
        duration: reduceMotion ? 0 : 0.62,
        ease: [0.22, 1, 0.36, 1] as const,
      },
      y: 0,
    },
  }

  return (
    <div className="group/auth relative isolate grid min-h-dvh overflow-hidden bg-[image:var(--auth-page-background)] lg:h-dvh lg:grid-cols-[56%_44%]">
      <ContourField className="z-0 opacity-70 transition-opacity duration-700 group-hover/auth:opacity-100" />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-background/55 backdrop-blur-[3px] lg:hidden"
      />
      <div className="relative z-10 flex min-h-dvh min-w-0 flex-col px-6 py-4 sm:px-8 md:px-12 md:py-5 lg:order-2 lg:min-h-0 lg:overflow-y-auto lg:py-3 xl:px-16">
        <header className="lg:hidden">
          <FinanceMark />
        </header>
        <motion.main
          animate="visible"
          className="flex w-full min-w-0 flex-1 flex-col items-center justify-center py-6 md:py-8 lg:py-0 xl:py-8"
          initial={reduceMotion ? false : "hidden"}
          variants={{
            hidden: {},
            visible: {
              transition: {
                delayChildren: 0.08,
                staggerChildren: reduceMotion ? 0 : 0.11,
              },
            },
          }}
        >
          <div className="flex w-full max-w-sm min-w-0 flex-col items-center gap-5 xl:gap-6">
            <motion.nav
              aria-label="Authentication"
              className="grid w-full grid-cols-2 gap-1 rounded-lg bg-muted/70 p-1"
              variants={formItem}
            >
              <Link
                aria-current={mode === "login" ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    variant: mode === "login" ? "outline" : "ghost",
                  }),
                  "font-light focus-visible:border-foreground/40 focus-visible:ring-foreground/10"
                )}
                to="/login"
              >
                Log in
              </Link>
              <Link
                aria-current={mode === "signup" ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    variant: mode === "signup" ? "outline" : "ghost",
                  }),
                  "font-light focus-visible:border-foreground/40 focus-visible:ring-foreground/10"
                )}
                to="/signup"
              >
                Sign up
              </Link>
            </motion.nav>
            <motion.div
              className="flex h-14 w-full flex-col items-center text-center"
              variants={formItem}
            >
              <h1 className="text-3xl font-light tracking-tight">
                {mode === "login" ? "Log in" : "Create account"}
              </h1>
              <p className="mt-1.5 text-sm font-light text-muted-foreground">
                {mode === "login"
                  ? "Continue to your spend ledger."
                  : "Start a ledger for your spend."}
              </p>
            </motion.div>
            {googleClientId && onGoogleCredential ? (
              <motion.div
                className="flex w-full flex-col gap-4"
                variants={formItem}
              >
                <GoogleSignInButton
                  disabled={pending}
                  onCredential={onGoogleCredential}
                />
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs font-light text-muted-foreground">
                    or continue with email
                  </span>
                  <Separator className="flex-1" />
                </div>
              </motion.div>
            ) : null}
            <motion.form
              className="flex w-full flex-col gap-4 [&_[data-slot=input-group]]:h-11 [&_button]:font-light [&_input]:min-h-11 [&_label]:font-light"
              noValidate
              onSubmit={onSubmit}
              variants={formItem}
            >
              <LayoutGroup id="auth-form">
                {children}
                {formError ? <FieldError>{formError}</FieldError> : null}
                <motion.div
                  layout="position"
                  transition={{ duration: reduceMotion ? 0 : 0.26 }}
                >
                  <Button
                    className="h-11 min-h-0 w-full font-normal focus-visible:border-foreground/40 focus-visible:ring-foreground/10 sm:h-10"
                    disabled={pending}
                    type="submit"
                  >
                    {submitLabel}
                  </Button>
                </motion.div>
              </LayoutGroup>
            </motion.form>
          </div>
        </motion.main>
        <p className="self-end text-xs font-light text-muted-foreground">
          © 2026 Finance
        </p>
      </div>
      <AuthPanel />
    </div>
  )
}
