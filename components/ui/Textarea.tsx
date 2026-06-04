import { cn } from "@/lib/utils/cn";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-outline-strong)] bg-[var(--color-card)] p-3.5 text-sm leading-relaxed text-[var(--color-on-surface)] transition-colors placeholder:text-[var(--color-on-surface-variant)]/60",
        "focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/15",
        className
      )}
      {...props}
    />
  );
}
