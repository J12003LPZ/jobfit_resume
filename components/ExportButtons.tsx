"use client";
import { Button } from "./ui/Button";
import { resumeToPlainText } from "@/lib/resume/toPlainText";
import { fitToOnePage } from "@/lib/resume/fitToOnePage";
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

  function downloadPdf() {
    const node = document.getElementById("resume-print");
    if (!node) {
      window.print();
      return;
    }
    const reset = fitToOnePage(node);

    // Hoist the resume to <body> so the rest of the (tall) app can be removed
    // from layout flow during print — otherwise it paginates into blank pages.
    const parent = node.parentNode as Node | null;
    const placeholder = document.createComment("resume-print");
    parent?.replaceChild(placeholder, node);
    document.body.appendChild(node);
    document.body.classList.add("printing-resume");

    const onAfterPrint = () => {
      document.body.classList.remove("printing-resume");
      parent?.replaceChild(node, placeholder);
      reset();
      window.removeEventListener("afterprint", onAfterPrint);
    };
    window.addEventListener("afterprint", onAfterPrint);
    window.print();
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
