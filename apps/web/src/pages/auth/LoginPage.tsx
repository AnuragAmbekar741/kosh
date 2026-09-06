import { zodResolver } from "@hookform/resolvers/zod"
import { Lock } from "lucide-react"
import { useForm } from "react-hook-form"
import { Navigate, useNavigate } from "react-router"

import { apiDetail } from "@/api/client"
import { AuthPasswordField } from "@/components/auth/AuthPasswordField"
import { AuthShell } from "@/components/auth/AuthShell"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useGoogleAuth, useLogin } from "@/hooks/auth/use-auth"
import { useGetMe } from "@/hooks/users/use-me"
import { loginSchema, type LoginValues } from "@/pages/auth/schema"

export function LoginPage() {
  const me = useGetMe()
  const login = useLogin()
  const google = useGoogleAuth()
  const navigate = useNavigate()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  if (me.data) {
    return <Navigate replace to="/" />
  }

  const pending = login.isPending || google.isPending
  const formError = apiDetail(login.error) ?? apiDetail(google.error)
  const emailError = form.formState.errors.email?.message
  const passwordError = form.formState.errors.password?.message

  return (
    <AuthShell
      description="Continue to your spend ledger."
      formError={formError}
      icon={Lock}
      onGoogleCredential={(id_token) => {
        google.mutate(
          { id_token },
          { onSuccess: () => navigate("/") },
        )
      }}
      onSubmit={form.handleSubmit((values) => {
        login.mutate(values, { onSuccess: () => navigate("/") })
      })}
      pending={pending}
      submitLabel="Continue"
      switchHint="Need an account?"
      switchLabel="Sign up"
      switchTo="/signup"
      title="Log in"
    >
      <FieldGroup>
        <Field data-invalid={emailError ? true : undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            aria-invalid={emailError ? true : undefined}
            autoComplete="email"
            id="email"
            type="email"
            {...form.register("email")}
          />
          {emailError ? <FieldError>{emailError}</FieldError> : null}
        </Field>
        <AuthPasswordField
          autoComplete="current-password"
          error={passwordError}
          id="password"
          {...form.register("password")}
        />
      </FieldGroup>
    </AuthShell>
  )
}
