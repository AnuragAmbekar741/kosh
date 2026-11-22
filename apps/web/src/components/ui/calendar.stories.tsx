import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import type { DateRange } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"

const BILL_DAY = new Date(2026, 10, 18)

const meta = {
  title: "Core/Forms/Calendar",
  component: Calendar,
  argTypes: {
    captionLayout: {
      control: "inline-radio",
      options: ["label", "dropdown", "dropdown-months", "dropdown-years"],
    },
    buttonVariant: {
      control: "inline-radio",
      options: ["ghost", "outline", "secondary"],
    },
    showOutsideDays: { control: "boolean" },
  },
  args: {
    defaultMonth: BILL_DAY,
  },
} satisfies Meta<typeof Calendar>

export default meta

type Story = StoryObj<typeof meta>

function SingleCalendar(props: Story["args"]) {
  const [selected, setSelected] = useState<Date | undefined>(BILL_DAY)
  return (
    <Calendar
      {...props}
      className="rounded-xl border"
      mode="single"
      onSelect={setSelected}
      selected={selected}
    />
  )
}

function RangeCalendar(props: Story["args"]) {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 10, 1),
    to: BILL_DAY,
  })
  return (
    <Calendar
      {...props}
      className="rounded-xl border"
      mode="range"
      numberOfMonths={2}
      onSelect={setRange}
      selected={range}
    />
  )
}

/** One bill date, as in DatePicker. */
export const Single: Story = {
  render: (args) => <SingleCalendar {...args} />,
}

/** Month and year dropdowns, as DatePicker uses. */
export const Dropdowns: Story = {
  args: { captionLayout: "dropdown" },
  render: (args) => <SingleCalendar {...args} />,
}

/** A custom spend period. */
export const Range: Story = {
  render: (args) => <RangeCalendar {...args} />,
}

/** Bills can't be dated in the future. */
export const NoFutureDates: Story = {
  args: { disabled: { after: BILL_DAY } },
  render: (args) => <SingleCalendar {...args} />,
}
