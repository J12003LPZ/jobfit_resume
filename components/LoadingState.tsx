export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-[var(--color-on-surface-variant)]">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      {label}
    </div>
  );
}
