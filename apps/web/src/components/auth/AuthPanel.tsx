function AuthPanelBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute -top-24 -left-16 size-72 rounded-full bg-white/40 blur-3xl animate-pulse-slow motion-reduce:animate-none" />
      <div className="absolute top-1/3 -right-20 size-80 rounded-full bg-ring/30 blur-3xl animate-pulse-slow motion-reduce:animate-none" />
      <div className="absolute -bottom-16 left-1/4 size-64 rounded-full bg-white/25 blur-3xl animate-pulse-slow motion-reduce:animate-none" />
    </div>
  )
}

export function AuthPanel() {
  return (
    <aside className="relative hidden min-h-svh overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col">
      <AuthPanelBackdrop />
      <div className="relative flex flex-col gap-4">
        <h2 className="font-heading max-w-sm text-3xl font-semibold tracking-tight">
          One ledger for every spend
        </h2>
        <p className="max-w-sm text-sm text-primary-foreground/70">
          Instantly extract data from receipts, sync bank lines, and log
          manual entries.
        </p>
      </div>
    </aside>
  )
}
