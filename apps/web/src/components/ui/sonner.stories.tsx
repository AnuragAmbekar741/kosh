import type { Meta, StoryObj } from "@storybook/react-vite"
import { toast } from "sonner"

import { Button } from "./button"
import { Toaster } from "./sonner"

// The Toaster is mounted once in .storybook/preview.tsx, as in the app.
const meta = {
  title: "Core/Feedback/Toast",
  component: Toaster,
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast("Bill added to review")} variant="outline">
        Default
      </Button>
      <Button
        onClick={() =>
          toast.success("Bill saved", {
            description: "Nature’s Basket · ₹736.00 · 5 lines",
          })
        }
        variant="outline"
      >
        Success
      </Button>
      <Button
        onClick={() =>
          toast.error("Couldn’t save the bill", {
            description: "Check your connection and try again.",
          })
        }
        variant="outline"
      >
        Error
      </Button>
      <Button
        onClick={() =>
          toast("Line removed", {
            action: { label: "Undo", onClick: () => toast("Line restored") },
          })
        }
        variant="outline"
      >
        With action
      </Button>
      <Button
        onClick={() =>
          toast.success(
            "Saved 3 bills from your October statement: Swiggy, Uber and DMart, totalling ₹4,120.45"
          )
        }
        variant="outline"
      >
        Long text
      </Button>
    </div>
  ),
} satisfies Meta<typeof Toaster>

export default meta

type Story = StoryObj<typeof meta>

export const Triggers: Story = {}
