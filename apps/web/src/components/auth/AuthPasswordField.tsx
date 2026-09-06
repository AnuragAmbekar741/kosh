import { useState, type ComponentProps } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

type AuthPasswordFieldProps = {
  id: string
  autoComplete: "current-password" | "new-password"
  error?: string
} & ComponentProps<typeof InputGroupInput>

export function AuthPasswordField({
  id,
  autoComplete,
  error,
  ...inputProps
}: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>Password</FieldLabel>
      <InputGroup>
        <InputGroupInput
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          id={id}
          type={visible ? "text" : "password"}
          {...inputProps}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => {
              setVisible((current) => !current)
            }}
            size="icon-xs"
            type="button"
          >
            {visible ? <EyeOff /> : <Eye />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}
