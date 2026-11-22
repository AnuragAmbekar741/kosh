import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactNode } from "react"

import {
  CATEGORIES,
  categorySwatchClass,
  categoryTintClass,
} from "@/components/spending/categories"
import { cn } from "@/lib/utils"

// Swatches read the CSS variables in src/app/index.css, so this page follows
// the tokens and flips with the Theme toolbar. See docs/design/global.md.

type Token = { name: string; note?: string }

const SURFACES: Token[] = [
  { name: "background", note: "canvas" },
  { name: "document-canvas", note: "document intake" },
  { name: "card", note: "surface-1, popover, sidebar" },
  { name: "secondary", note: "surface-2, accent, icon wells" },
  { name: "muted", note: "surface-3" },
  { name: "border", note: "hairline, input" },
]

const INK: Token[] = [
  { name: "foreground", note: "ink" },
  { name: "muted-foreground", note: "ink-subtle" },
  { name: "brand-ink", note: "links" },
  { name: "primary", note: "primary action" },
  { name: "primary-foreground", note: "on-primary" },
  { name: "ring", note: "focus" },
]

const STATUS: Token[] = [
  { name: "destructive", note: "errors, delete" },
  { name: "warning", note: "needs review" },
  { name: "chart-2", note: "success" },
]

const CHART: Token[] = [1, 2, 3, 4, 5].map((n) => ({ name: `chart-${n}` }))

const TYPE_SCALE = [
  { label: "text-2xl / semibold", className: "text-2xl font-semibold" },
  { label: "text-xl / semibold", className: "text-xl font-semibold" },
  { label: "text-base / medium", className: "text-base font-medium" },
  { label: "text-sm", className: "text-sm" },
  { label: "text-xs / muted", className: "text-xs text-muted-foreground" },
  {
    label: "tabular-nums (amounts)",
    className: "text-base font-medium tabular-nums",
  },
]

const RADII = ["sm", "md", "lg", "xl", "2xl", "3xl"] as const

const RADIUS_CLASS: Record<(typeof RADII)[number], string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

function Swatch({ token }: { token: Token }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="size-10 shrink-0 rounded-lg ring-1 ring-foreground/10"
        style={{ background: `var(--${token.name})` }}
      />
      <div className="flex min-w-0 flex-col">
        <code className="font-mono text-xs">--{token.name}</code>
        {token.note ? (
          <span className="text-xs text-muted-foreground">{token.note}</span>
        ) : null}
      </div>
    </div>
  )
}

function SwatchGrid({ tokens }: { tokens: Token[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tokens.map((token) => (
        <Swatch key={token.name} token={token} />
      ))}
    </div>
  )
}

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col gap-8 bg-background p-6 text-foreground sm:p-10">
      {children}
    </div>
  )
}

const meta = {
  title: "Foundations",
  parameters: { layout: "fullscreen" },
  tags: ["!autodocs"],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const Colors: Story = {
  render: () => (
    <Page>
      <Section title="Surfaces">
        <SwatchGrid tokens={SURFACES} />
      </Section>
      <Section title="Ink and actions">
        <SwatchGrid tokens={INK} />
      </Section>
      <Section title="Status">
        <SwatchGrid tokens={STATUS} />
      </Section>
      <Section title="Charts">
        <SwatchGrid tokens={CHART} />
      </Section>
    </Page>
  ),
}

export const Categories: Story = {
  render: () => (
    <Page>
      <Section title="Spend categories: tint + swatch">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category) => (
            <div key={category} className="flex items-center gap-3">
              <span
                className={cn(
                  "size-3 shrink-0 rounded-full",
                  categorySwatchClass(category)
                )}
              />
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  categoryTintClass(category)
                )}
              >
                {category}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  ),
}

export const Typography: Story = {
  render: () => (
    <Page>
      <Section title="Geist, the one family for headings, UI and body">
        <div className="flex flex-col gap-4">
          {TYPE_SCALE.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <code className="w-56 shrink-0 font-mono text-xs text-muted-foreground">
                {item.label}
              </code>
              <span className={item.className}>
                {item.label.startsWith("tabular")
                  ? "₹1,204.50  ₹88.00"
                  : "Groceries this month"}
              </span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Geist Mono">
        <span className="font-mono text-sm">INV-2026-0412 · 14:32</span>
      </Section>
    </Page>
  ),
}

export const Radius: Story = {
  render: () => (
    <Page>
      <Section title="Radius, derived from --radius">
        <div className="flex flex-wrap gap-4">
          {RADII.map((radius) => (
            <div key={radius} className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "size-16 bg-secondary ring-1 ring-border",
                  RADIUS_CLASS[radius]
                )}
              />
              <code className="font-mono text-xs">rounded-{radius}</code>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  ),
}
