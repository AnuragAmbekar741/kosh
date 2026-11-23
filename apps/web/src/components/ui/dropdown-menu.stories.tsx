import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  MoreHorizontalIcon,
  PencilIcon,
  ReceiptIcon,
  TagIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"
import { fn } from "storybook/test"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const meta = {
  title: "Core/Overlays/DropdownMenu",
  component: DropdownMenuContent,
  args: {
    align: "start",
  },
  argTypes: {
    align: { control: "inline-radio", options: ["start", "center", "end"] },
  },
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="flex min-h-96 items-start justify-center pt-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DropdownMenuContent>

export default meta

type Story = StoryObj<typeof meta>

const onEdit = fn()
const onDelete = fn()

function Trigger() {
  return (
    <DropdownMenuTrigger
      render={
        <Button aria-label="Bill actions" size="icon-sm" variant="ghost" />
      }
    >
      <MoreHorizontalIcon />
    </DropdownMenuTrigger>
  )
}

/** Row actions on a bill: items, a shortcut, a sub menu and a destructive item. */
export const Actions: Story = {
  render: (args) => (
    <DropdownMenu defaultOpen>
      <Trigger />
      <DropdownMenuContent {...args} className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Nature's Basket</DropdownMenuLabel>
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon />
            Edit bill
            <DropdownMenuShortcut>E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ReceiptIcon />
            View photo
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <TagIcon />
              Set category
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Groceries</DropdownMenuItem>
              <DropdownMenuItem>Household</DropdownMenuItem>
              <DropdownMenuItem>Pet</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2Icon />
          Delete bill
          <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

function FilterMenuDemo(args: Story["args"]) {
  const [sources, setSources] = useState({ photos: true, manual: false })
  const [sort, setSort] = useState("newest")
  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Filter bills
      </DropdownMenuTrigger>
      <DropdownMenuContent {...args} className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Source</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={sources.photos}
            onCheckedChange={(checked) =>
              setSources((current) => ({ ...current, photos: checked }))
            }
          >
            Bill photos
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={sources.manual}
            onCheckedChange={(checked) =>
              setSources((current) => ({ ...current, manual: checked }))
            }
          >
            Typed in
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
            <DropdownMenuRadioItem value="newest">
              Newest first
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="largest">
              Largest first
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Checkbox and radio items keep their own state. */
export const CheckboxAndRadio: Story = {
  render: (args) => <FilterMenuDemo {...args} />,
}

export const WithTrigger: Story = {
  render: (args) => (
    <DropdownMenu>
      <Trigger />
      <DropdownMenuContent {...args}>
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon />
          Edit bill
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2Icon />
          Delete bill
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}
