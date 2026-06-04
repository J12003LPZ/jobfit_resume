const STEPS = [
  {
    n: "01",
    title: "Paste the posting",
    body: "Drop in the job description text, or a link to the posting.",
  },
  {
    n: "02",
    title: "Review the gaps",
    body: "We extract the keywords an ATS scans for and show what's missing.",
  },
  {
    n: "03",
    title: "Generate & export",
    body: "Get a tailored, single-page résumé ready to download.",
  },
];

export function EmptyState() {
  return (
    <div className="flex h-full min-h-[420px] flex-col justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-outline-strong)] bg-[var(--color-surface)]/40 p-8">
      <p className="font-display text-sm italic text-[var(--color-primary)]">
        Your analysis will appear here
      </p>
      <h3 className="mt-1 font-display text-2xl font-semibold tracking-[-0.01em] text-[var(--color-on-surface)]">
        Three steps to a sharper résumé
      </h3>

      <ol className="mt-7 space-y-5">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-4">
            <span className="font-display text-lg font-semibold tabular-nums text-[var(--color-primary)]/70">
              {s.n}
            </span>
            <div className="border-l border-[var(--color-outline)] pl-4">
              <p className="font-semibold text-[var(--color-on-surface)]">
                {s.title}
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-on-surface-variant)]">
                {s.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
