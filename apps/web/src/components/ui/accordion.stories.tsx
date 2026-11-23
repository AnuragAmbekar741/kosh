import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion"

const ITEMS = [
  {
    value: "read",
    title: "How are bills read?",
    body: "Photos and PDFs are read in the background. Each line keeps the raw text from the bill; categories and catalog items are tags on top.",
  },
  {
    value: "currency",
    title: "What about other currencies?",
    body: "Amounts are never summed across currencies. Analytics shows the most used currency first and lets you switch.",
  },
  {
    value: "long",
    title:
      "Why does a bill from the same shop on the same day show up as a possible duplicate even when the totals differ slightly?",
    body: "We compare merchant, bill number, date and total. When the bill number matches we’re certain; otherwise a near match is flagged so you can decide.",
  },
]

const meta = {
  title: "Core/Layout/Accordion",
  component: Accordion,
  render: (args) => (
    <div className="w-[420px] max-w-full">
      <Accordion {...args}>
        {ITEMS.map((item) => (
          <AccordionItem key={item.value} value={item.value}>
            <AccordionTrigger>{item.title}</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">{item.body}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  ),
} satisfies Meta<typeof Accordion>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const OpenByDefault: Story = { args: { defaultValue: ["read"] } }

export const Multiple: Story = {
  args: { multiple: true, defaultValue: ["read", "currency"] },
}
