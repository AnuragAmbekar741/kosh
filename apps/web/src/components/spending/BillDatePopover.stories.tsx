import type { Meta, StoryObj } from "@storybook/react-vite"
import { useRef, useState } from "react"
import { fn } from "storybook/test"

import { Button } from "@/components/ui/button"

import { BillDatePopover } from "./BillDatePopover"

const meta = {
  title: "Finance/BillDatePopover",
  component: BillDatePopover,
  args: {
    anchor: { current: null },
    documentId: "doc-1",
    onOpenChange: fn(),
    open: false,
    spentAt: "2026-11-18",
    title: "Move Nature's Basket",
  },
  argTypes: {
    anchor: { control: false },
  },
  render: function Render(args) {
    const anchor = useRef<HTMLButtonElement>(null)
    const [open, setOpen] = useState(true)
    return (
      <div className="flex h-96 items-start justify-end">
        <Button onClick={() => setOpen(true)} ref={anchor} variant="outline">
          18 Nov
        </Button>
        <BillDatePopover
          {...args}
          anchor={anchor}
          onOpenChange={(next) => {
            setOpen(next)
            args.onOpenChange(next)
          }}
          open={open}
        />
      </div>
    )
  },
} satisfies Meta<typeof BillDatePopover>

export default meta

type Story = StoryObj<typeof meta>

/** Moves the whole bill, and every line on it, to the picked date. */
export const Default: Story = {}
