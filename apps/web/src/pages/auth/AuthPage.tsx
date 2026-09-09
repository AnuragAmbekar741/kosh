import { useEffect, useEffectEvent } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useForm } from "react-hook-form"
import { Navigate, useLocation, useNavigate } from "react-router"
import { z } from "zod"

import { apiDetail } from "@/api/client"
import { AuthPasswordField } from "@/components/auth/AuthPasswordField"
import { AuthShell } from "@/components/auth/AuthShell"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useGoogleAuth, useLogin, useRegister } from "@/hooks/auth/use-auth"
import { useGetMe } from "@/hooks/users/use-me"
import { loginSchema, signupSchema } from "@/pages/auth/schema"

const loginPageSchema = loginSchema.extend({ name: z.string() })
type AuthValues = z.infer<typeof loginPageSchema>

export function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const mode = location.pathname === "/signup" ? "signup" : "login"
  const me = useGetMe()
  const login = useLogin()
  const registerUser = useRegister()
  const google = useGoogleAuth()
  const form = useForm<AuthValues>({
    resolver: zodResolver(mode === "signup" ? signupSchema : loginPageSchema),
    defaultValues: { name: "", email: "", password: "" },
  })
  const { clearErrors } = form
  const { reset: resetGoogle } = google
  const { reset: resetLogin } = login
  const { reset: resetRegister } = registerUser
  const resetModeState = useEffectEvent(() => {
    clearErrors()
    resetLogin()
    resetRegister()
    resetGoogle()
  })

  useEffect(() => {
    resetModeState()
  }, [mode])

  if (me.data) {
    return <Navigate replace to="/" />
  }

  const activeMutation = mode === "login" ? login : registerUser
  const pending = activeMutation.isPending || google.isPending
  const formError = apiDetail(activeMutation.error) ?? apiDetail(google.error)
  const { errors } = form.formState

  return (
    <AuthShell
      formError={formError}
      mode={mode}
      onGoogleCredential={(id_token) => {
        google.mutate({ id_token }, { onSuccess: () => navigate("/") })
      }}
      onSubmit={form.handleSubmit((values) => {
        if (mode === "signup") {
          registerUser.mutate(values, { onSuccess: () => navigate("/") })
          return
        }

        login.mutate(
          { email: values.email, password: values.password },
          { onSuccess: () => navigate("/") }
        )
      })}
      pending={pending}
      submitLabel="Continue"
    >
      <FieldGroup className="relative gap-4">
        <AnimatePresence initial={false} mode="popLayout">
          {mode === "signup" ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              initial={reduceMotion ? false : { opacity: 0, y: -4 }}
              key="name"
              transition={{
                duration: reduceMotion ? 0 : 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  aria-invalid={errors.name ? true : undefined}
                  autoComplete="name"
                  className="focus-visible:border-foreground/40 focus-visible:ring-foreground/10"
                  id="name"
                  type="text"
                  {...form.register("name")}
                />
                {errors.name?.message ? (
                  <FieldError>{errors.name.message}</FieldError>
                ) : null}
              </Field>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <motion.div
          layout="position"
          transition={{ duration: reduceMotion ? 0 : 0.26 }}
        >
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              aria-invalid={errors.email ? true : undefined}
              autoComplete="email"
              className="focus-visible:border-foreground/40 focus-visible:ring-foreground/10"
              id="email"
              type="email"
              {...form.register("email")}
            />
            {errors.email?.message ? (
              <FieldError>{errors.email.message}</FieldError>
            ) : null}
          </Field>
        </motion.div>
        <motion.div
          layout="position"
          transition={{ duration: reduceMotion ? 0 : 0.26 }}
        >
          <AuthPasswordField
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            error={errors.password?.message}
            id="password"
            {...form.register("password")}
          />
        </motion.div>
      </FieldGroup>
    </AuthShell>
  )
}
