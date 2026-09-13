import { Wallet } from "lucide-react"

import { cn } from "@/lib/utils"

type FinanceMarkProps = {
  className?: string
}

export function FinanceMark({ className }: FinanceMarkProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Wallet className="size-5" strokeWidth={1.5} />
      </span>
      <span className="text-sm font-light tracking-wide">Kosh</span>
    </div>
  )
}
