import type { Meta, StoryObj } from "@storybook/react-vite"

import { DashboardSkeleton } from "./DashboardSkeleton"

const meta = {
  title: "Finance/DashboardSkeleton",
  component: DashboardSkeleton,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DashboardSkeleton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
