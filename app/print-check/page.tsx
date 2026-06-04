"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ResumeTemplate } from "@/lib/resume/renderResumeTemplate";
import { fitToOnePage } from "@/lib/resume/fitToOnePage";
import { leonardoProfile } from "@/data/leonardo-profile";
import type { Profile } from "@/types/profile";

// Build an intentionally oversized resume to prove the one-page fit shrinks
// overflowing content rather than spilling to a second page.
function longProfile(): Profile {
  const base = leonardoProfile;
  const exp = base.experience[0];
  return {
    ...base,
    experience: Array.from({ length: 4 }, (_, i) => ({
      ...exp,
      company: `${exp.company} #${i + 1}`,
      bullets: [...exp.bullets, ...exp.bullets],
    })),
    projects: Array.from({ length: 3 }, (_, i) => ({
      name: `Sample Project ${i + 1}`,
      technologies: ["React", "Node.js", "PostgreSQL", "TypeScript"],
      bullets: exp.bullets.slice(0, 4),
    })),
  };
}

export default function PrintCheckPage() {
  const params = useSearchParams();
  const variant = params.get("variant");
  const resume = variant === "long" ? longProfile() : leonardoProfile;

  useEffect(() => {
    const node = document.getElementById("resume-print");
    if (node) fitToOnePage(node);
    // Signal to the headless PDF checker that layout + fit are applied.
    document.body.setAttribute("data-print-ready", "1");
  }, [variant]);

  // Dev/check-only page; never expose in production builds.
  if (process.env.NODE_ENV === "production") return null;

  return <ResumeTemplate resume={resume} />;
}
