import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

type Tone = "matched" | "gap" | "neutral";

const TONES: Record<Tone, string> = {
  matched: "bg-[var(--color-emerald-bg)] text-[var(--color-emerald)]",
  gap: "bg-[var(--color-amber-bg)] text-[var(--color-amber)]",
  neutral: "bg-[var(--color-surface)] text-[var(--color-on-surface-variant)]",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        TONES[tone],
        className
      )}
      {...props}
    />
  );
}
