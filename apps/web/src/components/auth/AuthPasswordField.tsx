import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

type AuthPasswordFieldProps = {
  id: string
  autoComplete: "current-password" | "new-password"
}

export function AuthPasswordField({
  id,
  autoComplete,
}: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <Field>
      <FieldLabel htmlFor={id}>Password</FieldLabel>
      <InputGroup>
        <InputGroupInput
          autoComplete={autoComplete}
          id={id}
          name="password"
          type={visible ? "text" : "password"}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => {
              setVisible((current) => !current)
            }}
            size="icon-xs"
          >
            {visible ? <EyeOff /> : <Eye />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}
