"use client";
import { useEffect, useRef } from "react";
import { ResumeTemplate } from "@/lib/resume/renderResumeTemplate";
import { fitToOnePage } from "@/lib/resume/fitToOnePage";
import type { Profile } from "@/types/profile";

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
    <div ref={ref} className="overflow-hidden rounded-lg border border-[var(--color-outline)] bg-white">
      <ResumeTemplate resume={resume} editable={editable} onChange={onChange} />
    </div>
  );
}
