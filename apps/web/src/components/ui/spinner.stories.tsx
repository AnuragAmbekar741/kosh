import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "./button"
import { Spinner } from "./spinner"

const meta = {
  title: "Core/Feedback/Spinner",
  component: Spinner,
} satisfies Meta<typeof Spinner>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4 text-muted-foreground">
      <Spinner className="size-3" />
      <Spinner />
      <Spinner className="size-6" />
    </div>
  ),
}

export const InButton: Story = {
  render: () => (
    <Button disabled>
      <Spinner data-icon="inline-start" />
      Saving bill
    </Button>
  ),
}

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner />
      Reading natures-basket-18-nov.jpg…
    </div>
  ),
}
