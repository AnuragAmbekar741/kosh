import { useState } from "react"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { fromIsoDate, toIsoDate } from "./spend-period"
import { formatDate } from "./spending-formatters"

type DatePickerProps = {
  "aria-label": string
  invalid?: boolean
  size?: "default" | "sm"
  onChange: (isoDate: string) => void
  /** ISO date (`YYYY-MM-DD`) or empty. */
  value: string
}

/** shadcn date picker: an outline button that opens a Calendar popover. */
export function DatePicker({
  "aria-label": ariaLabel,
  invalid = false,
  onChange,
  size = "default",
  value,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = value ? fromIsoDate(value) : undefined

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-invalid={invalid}
            aria-label={ariaLabel}
            className="justify-start font-normal data-[empty=true]:text-muted-foreground"
            data-empty={!value}
            size={size}
            variant="outline"
          >
            <CalendarIcon data-icon="inline-start" />
            {value ? formatDate(value) : "Pick a date"}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          autoFocus
          captionLayout="dropdown"
          defaultMonth={selected}
          mode="single"
          onSelect={(date) => {
            if (!date) return
            onChange(toIsoDate(date))
            setOpen(false)
          }}
          selected={selected}
        />
      </PopoverContent>
    </Popover>
  )
}
