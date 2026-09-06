import { zodResolver } from "@hookform/resolvers/zod"
import { User } from "lucide-react"
import { useForm } from "react-hook-form"
import { Navigate, useNavigate } from "react-router"

import { apiDetail } from "@/api/client"
import { AuthPasswordField } from "@/components/auth/AuthPasswordField"
import { AuthShell } from "@/components/auth/AuthShell"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useGoogleAuth, useRegister } from "@/hooks/auth/use-auth"
import { useGetMe } from "@/hooks/users/use-me"
import { signupSchema, type SignupValues } from "@/pages/auth/schema"

export function SignupPage() {
  const me = useGetMe()
  const registerUser = useRegister()
  const google = useGoogleAuth()
  const navigate = useNavigate()
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  })

  if (me.data) {
    return <Navigate replace to="/" />
  }

  const pending = registerUser.isPending || google.isPending
  const formError = apiDetail(registerUser.error) ?? apiDetail(google.error)
  const nameError = form.formState.errors.name?.message
  const emailError = form.formState.errors.email?.message
  const passwordError = form.formState.errors.password?.message

  return (
    <AuthShell
      description="Start a ledger for your spend."
      formError={formError}
      icon={User}
      onGoogleCredential={(id_token) => {
        google.mutate(
          { id_token },
          { onSuccess: () => navigate("/") },
        )
      }}
      onSubmit={form.handleSubmit((values) => {
        registerUser.mutate(values, { onSuccess: () => navigate("/") })
      })}
      pending={pending}
      submitLabel="Continue"
      switchHint="Already have an account?"
      switchLabel="Log in"
      switchTo="/login"
      title="Create account"
    >
      <FieldGroup>
        <Field data-invalid={nameError ? true : undefined}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            aria-invalid={nameError ? true : undefined}
            autoComplete="name"
            id="name"
            type="text"
            {...form.register("name")}
          />
          {nameError ? <FieldError>{nameError}</FieldError> : null}
        </Field>
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
          autoComplete="new-password"
          error={passwordError}
          id="password"
          {...form.register("password")}
        />
      </FieldGroup>
    </AuthShell>
  )
}
