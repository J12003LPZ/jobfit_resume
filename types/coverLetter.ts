import type { ContactInfo } from "@/types/profile";

/** The prose the model is allowed to write. Nothing factual lives here. */
export type CoverLetterContent = {
  greeting: string;   // e.g. "Dear Hiring Manager,"
  opening: string;    // one paragraph
  body: string[];     // 1–3 paragraphs mapping real experience -> job needs
  closing: string;    // one paragraph
};

/** A fully renderable letter: model prose + app-supplied authoritative facts. */
export type CoverLetter = CoverLetterContent & {
  candidateName: string;
  contact: ContactInfo;
  date: string;       // formatted, e.g. "June 5, 2026"
  recipient: string;  // e.g. "Hiring Team, Acme Corp"
  jobTitle: string;   // the role being applied to
};
