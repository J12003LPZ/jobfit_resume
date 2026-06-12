"use client";
import { useEffect, useRef, useState } from "react";
import { ResumeTemplate } from "@/lib/resume/renderResumeTemplate";
import { fitToOnePage } from "@/lib/resume/fitToOnePage";
import type { Profile } from "@/types/profile";

// The template box is 8.5in wide = 816 CSS px at 96dpi.
const TEMPLATE_W_PX = 8.5 * 96;

export function ResumePreview({
  resume,
  editable = false,
  onChange,
}: {
  resume: Profile;
  editable?: boolean;
  onChange?: (next: Profile) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Scale the fixed-width template down to the container (phones), never up.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / TEMPLATE_W_PX));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const node = ref.current?.querySelector<HTMLElement>("#resume-print");
    if (!node) return;
    // While editing, render at natural scale so typing isn't zoomed; re-fit to a
    // single page once editing ends (and the print path re-fits before export).
    if (editable) {
      node.style.zoom = "1";
    } else {
      fitToOnePage(node);
    }
  }, [resume, editable]);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-lg border border-[var(--color-outline)] bg-white"
    >
      {/* CSS zoom (unlike transform) affects layout, so the container height
          shrinks with the content and no dead whitespace is left behind. */}
      <div style={{ zoom: scale }}>
        <ResumeTemplate resume={resume} editable={editable} onChange={onChange} />
      </div>
    </div>
  );
}
