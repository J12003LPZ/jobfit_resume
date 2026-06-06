"use client";
import { createElement, useEffect, useRef, type ReactNode } from "react";

type EditableProps = {
  /** Current text value (also the displayed content). */
  value: string;
  /** When true the element becomes contentEditable. */
  editing: boolean;
  /** Fired on blur with the new text. Commit-on-blur keeps the caret from
   *  jumping, since React never re-renders the node mid-typing. */
  onCommit: (next: string) => void;
  /** Tag to render. Defaults to a span. */
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
  /** Optional placeholder-ish children when value is empty and not editing. */
  children?: ReactNode;
};

export function Editable({
  value,
  editing,
  onCommit,
  as = "span",
  className,
  style,
}: EditableProps) {
  const ref = useRef<HTMLElement>(null);

  // Keep the DOM text in sync when the value changes from outside (e.g. a fresh
  // generation) and the node isn't currently focused for editing.
  useEffect(() => {
    const el = ref.current;
    if (el && el !== document.activeElement && el.textContent !== value) {
      el.textContent = value;
    }
  }, [value]);

  return createElement(as, {
    ref,
    style,
    className: [
      className,
      editing
        ? "rounded-sm outline-dashed outline-1 outline-[var(--color-outline)] hover:bg-amber-50 focus:bg-amber-50 focus:outline-[var(--color-primary)]"
        : "",
    ]
      .filter(Boolean)
      .join(" "),
    contentEditable: editing,
    suppressContentEditableWarning: true,
    spellCheck: editing,
    onBlur: editing
      ? (e: React.FocusEvent<HTMLElement>) => {
          const next = e.currentTarget.textContent ?? "";
          if (next !== value) onCommit(next);
        }
      : undefined,
    // Render initial text content. Subsequent external updates handled by effect.
    children: value,
  });
}
