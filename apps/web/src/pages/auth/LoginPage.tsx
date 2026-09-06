import { Lock } from "lucide-react"

import { AuthPasswordField } from "@/components/auth/AuthPasswordField"
import { AuthShell } from "@/components/auth/AuthShell"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginPage() {
  return (
    <AuthShell
      description="Continue to your spend ledger."
      icon={Lock}
      submitLabel="Continue"
      switchHint="Need an account?"
      switchLabel="Sign up"
      switchTo="/signup"
      title="Log in"
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input autoComplete="email" id="email" name="email" type="email" />
        </Field>
        <AuthPasswordField autoComplete="current-password" id="password" />
      </FieldGroup>
    </AuthShell>
  )
}
