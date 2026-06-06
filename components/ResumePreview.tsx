"use client";
import { useEffect, useRef } from "react";
import { ResumeTemplate } from "@/lib/resume/renderResumeTemplate";
import { fitToOnePage } from "@/lib/resume/fitToOnePage";
import type { Profile } from "@/types/profile";

export function ResumePreview({ resume }: { resume: Profile }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current?.querySelector<HTMLElement>("#resume-print");
    if (node) fitToOnePage(node);
  }, [resume]);

  return (
    <div ref={ref} className="overflow-hidden rounded-lg border border-[var(--color-outline)] bg-white">
      <ResumeTemplate resume={resume} />
    </div>
  );
}
