import { Button } from "./ui/Button";

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-[var(--color-rose)] bg-[var(--color-rose-bg)] p-4 text-sm">
      <p className="font-medium text-[var(--color-rose)]">Something went wrong</p>
      <p className="mt-1 text-[var(--color-on-surface-variant)]">{message}</p>
      <Button variant="secondary" className="mt-3" onClick={onRetry}>Try again</Button>
    </div>
  );
}
