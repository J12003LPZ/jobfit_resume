"use client";
import { Button } from "./ui/Button";
import { resumeToPlainText } from "@/lib/resume/toPlainText";
import { exportResumeToPdf } from "@/lib/resume/exportToPdf";
import type { Profile } from "@/types/profile";

export function ExportButtons({
  resume,
  onRegenerate,
  editing = false,
  onToggleEdit,
}: {
  resume: Profile;
  onRegenerate: () => void;
  editing?: boolean;
  onToggleEdit?: () => void;
}) {
  async function copyText() {
    await navigator.clipboard.writeText(resumeToPlainText(resume));
  }

  async function downloadPdf() {
    await exportResumeToPdf(resume);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={copyText}>Copy Text</Button>
      {onToggleEdit && (
        <Button variant="secondary" onClick={onToggleEdit}>
          {editing ? "Done" : "Edit"}
        </Button>
      )}
      <Button variant="secondary" onClick={downloadPdf}>Download PDF</Button>
      <Button variant="ghost" onClick={onRegenerate}>Regenerate</Button>
    </div>
  );
}
