export function AuthPanel() {
  return (
    <aside className="relative z-10 hidden min-h-dvh text-foreground lg:order-1 lg:flex lg:min-h-0 lg:flex-col lg:justify-between lg:p-12 xl:p-20">
      <div className="max-w-xl">
        <h2 className="max-w-lg text-[clamp(3.25rem,5vw,5.75rem)] leading-[0.96] font-light tracking-[-0.035em] text-balance">
          Know where it goes.
        </h2>
        <p className="mt-7 max-w-md text-base leading-relaxed font-light text-muted-foreground">
          Scan bills, track spending, and turn everyday records into a clearer
          view of your money.
        </p>
      </div>
    </aside>
  )
}
