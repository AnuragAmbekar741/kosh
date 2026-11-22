import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const meta = {
  title: "Core/Overlays/Dialog",
  component: DialogContent,
  args: {
    showCloseButton: true,
  },
  argTypes: {
    showCloseButton: { control: "boolean" },
  },
} satisfies Meta<typeof DialogContent>

export default meta

type Story = StoryObj<typeof meta>

const onDiscard = fn()

export const Open: Story = {
  render: (args) => (
    <Dialog defaultOpen>
      <DialogTrigger render={<Button variant="outline" />}>
        Discard bill
      </DialogTrigger>
      <DialogContent {...args}>
        <DialogHeader>
          <DialogTitle>Discard this bill?</DialogTitle>
          <DialogDescription>
            Nature's Basket, 18 Nov · 5 items · ₹736.00. Nothing has been saved
            yet, so this can't be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Keep bill
          </DialogClose>
          <DialogClose
            render={<Button variant="destructive" onClick={onDiscard} />}
          >
            Discard
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const WithTrigger: Story = {
  render: (args) => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Discard bill
      </DialogTrigger>
      <DialogContent {...args}>
        <DialogHeader>
          <DialogTitle>Discard this bill?</DialogTitle>
          <DialogDescription>
            The extracted lines are removed. The photo stays in your uploads.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Keep bill
          </DialogClose>
          <DialogClose
            render={<Button variant="destructive" onClick={onDiscard} />}
          >
            Discard
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

/** No corner ×: the footer's Close button is the only way out. */
export const NoCloseButton: Story = {
  args: { showCloseButton: false },
  render: (args) => (
    <Dialog defaultOpen>
      <DialogContent {...args}>
        <DialogHeader>
          <DialogTitle>Bill saved</DialogTitle>
          <DialogDescription>
            5 items from Nature's Basket were added to November.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  ),
}
