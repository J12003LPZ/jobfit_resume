export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-[var(--color-outline)] bg-white px-6 py-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-primary)]">JobFit Resume</h1>
        <p className="text-xs text-[var(--color-on-surface-variant)]">AI-powered ATS resume tailoring</p>
      </div>
      <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-on-surface-variant)]">
        No login required
      </span>
    </header>
  );
}
