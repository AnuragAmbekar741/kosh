import type { Category } from "@/api/spend-items/spend-items.types"

export const STARTER_COPY = {
  pronunciation: "/kōsh/",
  meaning: "a treasury. Yours is in the details.",
  lede: {
    before: "Kosh reads every bill ",
    emphasis: "line by line",
    after:
      " and keeps it in one ledger. Read across the lines and your habits show up on their own: what you buy, where, and how often.",
  },
  addBill: "Add your first bill",
  askAssistant: "Ask the assistant",
} as const

export const LEDGER_COPY = {
  month: "October",
  tag: "Example",
  replay: "Replay example",
  pattern: {
    title: "Late-night delivery, 4 times this month",
    detail: "$75.45 so far, all after 9 pm. Pad thai twice.",
  },
} as const

export type SampleLine = {
  id: string
  date: string
  name: string
  category: Category
  amount: string
  /** Part of the late-night pattern: the name gets a ring underline. */
  highlight?: boolean
}

export const SAMPLE_LINES: SampleLine[] = [
  {
    id: "oct-3",
    date: "Oct 3",
    name: "DoorDash · Pad thai",
    category: "Dining out",
    amount: "$18.40",
    highlight: true,
  },
  {
    id: "oct-6",
    date: "Oct 6",
    name: "Uber · Home",
    category: "Transport",
    amount: "$14.20",
  },
  {
    id: "oct-9",
    date: "Oct 9",
    name: "DoorDash · Ramen",
    category: "Dining out",
    amount: "$21.75",
    highlight: true,
  },
  {
    id: "oct-11",
    date: "Oct 11",
    name: "Target · Phone case",
    category: "Shopping",
    amount: "$12.99",
  },
  {
    id: "oct-13",
    date: "Oct 13",
    name: "DoorDash · Tacos",
    category: "Dining out",
    amount: "$16.90",
    highlight: true,
  },
  {
    id: "oct-15",
    date: "Oct 15",
    name: "DoorDash · Pad thai",
    category: "Dining out",
    amount: "$18.40",
    highlight: true,
  },
]

export type StarterStep = {
  id: string
  title: string
  text: string
  label: string
} & ({ to: string } | { action: "upload" })

export const STARTER_STEPS: StarterStep[] = [
  {
    id: "add",
    title: "Add a bill",
    text: "Snap a photo or drop a PDF. Kosh reads the store, the date and every line.",
    label: "Upload a bill",
    action: "upload",
  },
  {
    id: "review",
    title: "Check what Kosh read",
    text: "Every line gets a category. Fix anything, then confirm. Only confirmed bills count.",
    label: "Bills to review",
    to: "/spending/bills",
  },
  {
    id: "habits",
    title: "Watch your habits form",
    text: "Kosh spots what you buy again and again, by item, store and category.",
    label: "Open Analytics",
    to: "/spending/analytics",
  },
]
