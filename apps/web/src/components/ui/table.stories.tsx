import type { Meta, StoryObj } from "@storybook/react-vite"

import { formatMoney } from "@/components/spending/spending-formatters"
import { billLines, CURRENCY, longLine } from "@/stories/fixtures"

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table"

const meta = {
  title: "Core/Layout/Table",
  component: Table,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Table>

export default meta

type Story = StoryObj<typeof meta>

function Ledger({ lines }: { lines: typeof billLines }) {
  const total = lines.reduce((sum, line) => sum + Number(line.amount), 0)
  return (
    <div className="max-w-xl">
      <Table>
        <TableCaption>Nature’s Basket · 18 Nov 2026</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Line</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="max-w-64 truncate">
                {line.description}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {line.category ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(line.amount, line.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(total, CURRENCY)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

export const BillLines: Story = {
  render: () => <Ledger lines={billLines} />,
}

export const LongText: Story = {
  render: () => <Ledger lines={[...billLines.slice(0, 2), longLine]} />,
}

export const Empty: Story = {
  render: () => (
    <div className="max-w-xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Line</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell
              className="h-20 text-center text-muted-foreground"
              colSpan={2}
            >
              No lines on this bill yet.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
}
