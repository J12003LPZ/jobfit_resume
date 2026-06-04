import { Card } from "./ui/Card";

export function MatchScoreCard({ current, potential }: { current: number; potential: number }) {
  return (
    <Card className="flex items-center justify-between gap-6">
      <div>
        <p className="text-xs font-medium uppercase text-[var(--color-on-surface-variant)]">
          Current Match
        </p>
        <p className="text-3xl font-bold text-[var(--color-primary)]">{current}%</p>
      </div>
      <div className="text-2xl text-[var(--color-on-surface-variant)]">→</div>
      <div>
        <p className="text-xs font-medium uppercase text-[var(--color-on-surface-variant)]">
          After Accepting Gaps
        </p>
        <p className="text-3xl font-bold text-[var(--color-emerald)]">{potential}%</p>
      </div>
    </Card>
  );
}
