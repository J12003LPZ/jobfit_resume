export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-outline)] bg-[var(--color-canvas)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden
            className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary)] font-display text-lg font-semibold text-[var(--color-on-primary)] shadow-[0_6px_16px_-6px_rgba(184,73,42,0.7)]"
          >
            JF
          </span>
          <div className="leading-tight">
            <h1 className="font-display text-[1.35rem] font-semibold tracking-[-0.01em] text-[var(--color-on-surface)]">
              JobFit{" "}
              <span className="italic text-[var(--color-primary)]">Resume</span>
            </h1>
            <p className="text-[0.72rem] uppercase tracking-[0.16em] text-[var(--color-on-surface-variant)]">
              ATS Résumé Tailoring
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[var(--color-outline-strong)] bg-[var(--color-card)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-on-surface-variant)]">
          <span className="size-1.5 rounded-full bg-[var(--color-emerald)]" />
          No login required
        </span>
      </div>
    </header>
  );
}
