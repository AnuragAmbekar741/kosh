import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const emptyVariants = cva(
  "group/empty flex flex-col bg-(image:--empty-wash) text-balance",
  {
    variants: {
      variant: {
        // A page with nothing to show: a left-aligned banner on a slate mist.
        card: "w-full max-w-[520px] items-start gap-2.5 overflow-hidden rounded-2xl border bg-card px-6 pt-7 pb-6 text-left shadow-sm sm:px-7 sm:pt-8",
        // Inside a popover or panel that already frames it: no second box.
        plain: "w-full items-center gap-5 px-6 py-10 text-center",
      },
    },
    defaultVariants: {
      variant: "card",
    },
  }
)

function Empty({
  className,
  variant = "card",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyVariants>) {
  return (
    <div
      data-slot="empty"
      data-variant={variant}
      className={cn(emptyVariants({ variant }), className)}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        "flex max-w-sm flex-col items-center gap-2 group-data-[variant=card]/empty:max-w-none group-data-[variant=card]/empty:items-start",
        className
      )}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "mb-1 flex size-11 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-sm ring-1 ring-border [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function EmptyEyebrow({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="empty-eyebrow"
      className={cn(
        "mb-0.5 font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn(
        "font-heading text-base font-medium tracking-tight group-data-[variant=card]/empty:text-xl",
        className
      )}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "max-w-xs text-sm/relaxed text-muted-foreground group-data-[variant=card]/empty:max-w-[40ch] group-data-[variant=card]/empty:text-pretty [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full max-w-sm min-w-0 flex-col items-center gap-2.5 text-sm text-balance",
        // Card actions share a two-column grid so every button is the same width.
        "group-data-[variant=card]/empty:mt-4 group-data-[variant=card]/empty:grid group-data-[variant=card]/empty:grid-cols-2 group-data-[variant=card]/empty:gap-2 group-data-[variant=card]/empty:[&>*]:w-full",
        className
      )}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyEyebrow,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
}
