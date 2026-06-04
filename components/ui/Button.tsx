import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[0_8px_20px_-10px_rgba(184,73,42,0.85)] hover:bg-[var(--color-primary-strong)] hover:-translate-y-px active:translate-y-0",
  secondary:
    "bg-[var(--color-card)] border border-[var(--color-outline-strong)] text-[var(--color-on-surface)] hover:border-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface)]",
  ghost:
    "bg-transparent text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface)] hover:text-[var(--color-on-surface)]",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}
