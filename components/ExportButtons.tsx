"use client";
import { Button } from "./ui/Button";
import { resumeToPlainText } from "@/lib/resume/toPlainText";
import type { Profile } from "@/types/profile";

export function ExportButtons({ resume, onRegenerate }: { resume: Profile; onRegenerate: () => void }) {
  async function copyText() {
    await navigator.clipboard.writeText(resumeToPlainText(resume));
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={copyText}>Copy Text</Button>
      <Button variant="secondary" onClick={() => window.print()}>Download PDF</Button>
      <Button variant="ghost" onClick={onRegenerate}>Regenerate</Button>
    </div>
  );
}
