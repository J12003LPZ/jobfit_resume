"use client";
import { Button } from "./ui/Button";
import { resumeToPlainText } from "@/lib/resume/toPlainText";
import { fitToOnePage } from "@/lib/resume/fitToOnePage";
import type { Profile } from "@/types/profile";

export function ExportButtons({ resume, onRegenerate }: { resume: Profile; onRegenerate: () => void }) {
  async function copyText() {
    await navigator.clipboard.writeText(resumeToPlainText(resume));
  }

  function downloadPdf() {
    const node = document.getElementById("resume-print");
    if (!node) {
      window.print();
      return;
    }
    const reset = fitToOnePage(node);
    const onAfterPrint = () => {
      reset();
      window.removeEventListener("afterprint", onAfterPrint);
    };
    window.addEventListener("afterprint", onAfterPrint);
    window.print();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={copyText}>Copy Text</Button>
      <Button variant="secondary" onClick={downloadPdf}>Download PDF</Button>
      <Button variant="ghost" onClick={onRegenerate}>Regenerate</Button>
    </div>
  );
}
