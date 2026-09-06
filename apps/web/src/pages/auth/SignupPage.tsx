import { User } from "lucide-react"

import { AuthPasswordField } from "@/components/auth/AuthPasswordField"
import { AuthShell } from "@/components/auth/AuthShell"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function SignupPage() {
  return (
    <AuthShell
      description="Start a ledger for your spend."
      icon={User}
      submitLabel="Continue"
      switchHint="Already have an account?"
      switchLabel="Log in"
      switchTo="/login"
      title="Create account"
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input autoComplete="name" id="name" name="name" type="text" />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input autoComplete="email" id="email" name="email" type="email" />
        </Field>
        <AuthPasswordField autoComplete="new-password" id="password" />
      </FieldGroup>
    </AuthShell>
  )
}
