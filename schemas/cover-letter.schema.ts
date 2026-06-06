import { z } from "zod";

// Only the prose the model writes. The route supplies all factual fields
// (name, contact, date, recipient, jobTitle) and never trusts the model for
// them. Defaults keep a partial-but-usable response from hard-failing.
export const coverLetterContentSchema = z.object({
  greeting: z.string().default("Dear Hiring Manager,"),
  opening: z.string(),
  body: z.array(z.string()).default([]),
  closing: z.string(),
});
