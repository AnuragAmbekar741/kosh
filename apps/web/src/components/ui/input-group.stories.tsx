import type { Meta, StoryObj } from "@storybook/react-vite"
import { EyeIcon, SearchIcon, SendIcon, XIcon } from "lucide-react"
import { fn } from "storybook/test"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"

const meta = {
  title: "Core/Forms/InputGroup",
  component: InputGroup,
  argTypes: {
    size: { control: "inline-radio", options: ["default", "dense"] },
  },
  args: { size: "default" },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InputGroup>

export default meta

type Story = StoryObj<typeof meta>

/** The spending toolbar search. */
export const Search: Story = {
  render: (args) => (
    <InputGroup {...args}>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        aria-label="Search"
        defaultValue="milk"
        placeholder="Search merchants or items"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label="Clear search"
          onClick={fn()}
          size="icon-xs"
        >
          <XIcon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const Dense: Story = { ...Search, args: { size: "dense" } }

export const Currency: Story = {
  render: (args) => (
    <InputGroup {...args}>
      <InputGroupAddon>
        <InputGroupText>₹</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        aria-label="Amount"
        className="tabular-nums"
        inputMode="decimal"
        placeholder="0.00"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>INR</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  ),
}

/** As in the password field: an icon button at the end. */
export const Password: Story = {
  render: (args) => (
    <InputGroup {...args}>
      <InputGroupInput
        aria-label="Password"
        defaultValue="correct-horse"
        type="password"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label="Show password"
          onClick={fn()}
          size="icon-xs"
        >
          <EyeIcon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const Composer: Story = {
  render: (args) => (
    <InputGroup {...args}>
      <InputGroupTextarea
        aria-label="Message"
        placeholder="Spent 450 on groceries at DMart today"
      />
      <InputGroupAddon align="block-end">
        <InputGroupText>Enter to send</InputGroupText>
        <InputGroupButton
          aria-label="Send"
          className="ml-auto"
          onClick={fn()}
          size="icon-round"
          variant="default"
        >
          <SendIcon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const Invalid: Story = {
  render: (args) => (
    <InputGroup {...args}>
      <InputGroupAddon>
        <InputGroupText>₹</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput aria-invalid aria-label="Amount" defaultValue="12,0" />
    </InputGroup>
  ),
}

export const Disabled: Story = {
  render: (args) => (
    <InputGroup {...args} data-disabled="true">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput aria-label="Search" disabled placeholder="Search" />
    </InputGroup>
  ),
}
