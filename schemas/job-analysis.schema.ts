import { z } from "zod";

const strArray = z.array(z.string()).default([]);

export const jobAnalysisSchema = z.object({
  jobTitle: z.string().min(1),
  companyName: z.string().optional(),
  technologies: strArray,
  hardSkills: strArray,
  softSkills: strArray,
  responsibilities: strArray,
  preferredQualifications: strArray,
  atsKeywords: strArray,
});

export type JobAnalysisInput = z.infer<typeof jobAnalysisSchema>;
