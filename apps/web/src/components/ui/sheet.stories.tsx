import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const meta = {
  title: "Core/Overlays/Sheet",
  component: SheetContent,
  args: {
    side: "right",
    showCloseButton: true,
  },
  argTypes: {
    side: {
      control: "inline-radio",
      options: ["top", "right", "bottom", "left"],
    },
    showCloseButton: { control: "boolean" },
  },
} satisfies Meta<typeof SheetContent>

export default meta

type Story = StoryObj<typeof meta>

function LineForm() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-2 pb-4">
      <Field className="gap-1.5">
        <FieldLabel htmlFor="sheet-line-text">Line text</FieldLabel>
        <Input id="sheet-line-text" defaultValue="AMUL TAAZA TONED MILK 1L" />
      </Field>
      <Field className="gap-1.5">
        <FieldLabel htmlFor="sheet-line-amount">Amount</FieldLabel>
        <Input
          id="sheet-line-amount"
          className="tabular-nums"
          defaultValue="68.00"
          inputMode="decimal"
        />
      </Field>
    </div>
  )
}

/** The phone bill-line sheet: bottom, rounded top, capped height. */
export const PhoneBottom: Story = {
  args: { side: "bottom" },
  globals: { viewport: { value: "phone", isRotated: false } },
  render: (args) => (
    <Sheet defaultOpen>
      <SheetTrigger render={<Button variant="outline" />}>
        Edit item
      </SheetTrigger>
      <SheetContent {...args} className="max-h-[92dvh] gap-0 rounded-t-2xl">
        <SheetHeader className="pr-14 pb-2">
          <SheetTitle>Edit item</SheetTitle>
          <SheetDescription className="truncate">
            Nature's Basket · 18 Nov
          </SheetDescription>
        </SheetHeader>
        <LineForm />
        <SheetFooter>
          <Button>Save</Button>
          <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

function SideSheet({
  side,
  showCloseButton,
}: {
  side: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <Sheet defaultOpen>
      <SheetTrigger render={<Button variant="outline" />}>
        Open {side}
      </SheetTrigger>
      <SheetContent side={side} showCloseButton={showCloseButton}>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Narrow the ledger by date, category or source.
          </SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose render={<Button />}>Show 23 bills</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export const Right: Story = {
  render: (args) => <SideSheet {...args} side="right" />,
}

export const Left: Story = {
  render: (args) => <SideSheet {...args} side="left" />,
}

export const Top: Story = {
  render: (args) => <SideSheet {...args} side="top" />,
}

export const Bottom: Story = {
  render: (args) => <SideSheet {...args} side="bottom" />,
}

export const WithTrigger: Story = {
  render: (args) => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Open filters
      </SheetTrigger>
      <SheetContent {...args}>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Narrow the ledger by date, category or source.
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
}
