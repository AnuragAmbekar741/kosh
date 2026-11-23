import type { Meta, StoryObj } from "@storybook/react-vite"

import { FinanceMark } from "./FinanceMark"

const meta = {
  title: "Brand/FinanceMark",
  component: FinanceMark,
} satisfies Meta<typeof FinanceMark>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
