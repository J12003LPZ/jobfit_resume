import { z } from "zod";

const strArray = z.array(z.string()).default([]);

const FALLBACK_JOB_TITLE = "Untitled Role";

// The model occasionally returns an empty/whitespace/missing jobTitle even
// though it is required. Coerce to a sensible fallback so an otherwise-valid
// analysis (keywords, skills) isn't discarded over a missing label.
const jobTitle = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : FALLBACK_JOB_TITLE),
  z.string().min(1),
);

export const jobAnalysisSchema = z.object({
  jobTitle,
  companyName: z.string().optional(),
  technologies: strArray,
  hardSkills: strArray,
  softSkills: strArray,
  responsibilities: strArray,
  preferredQualifications: strArray,
  atsKeywords: strArray,
});

export type JobAnalysisInput = z.infer<typeof jobAnalysisSchema>;
