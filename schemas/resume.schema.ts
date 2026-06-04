import { z } from "zod";
import {
  profileSchema,
  experienceSchema,
  projectSchema,
  educationSchema,
} from "./profile.schema";

// A generated resume mirrors the profile shape, but the model may omit
// top-level arrays entirely (e.g. no `projects` key). Default those to [] so a
// partial-but-otherwise-valid response still yields a resume instead of a hard
// validation failure. The route re-applies authoritative profile facts after.
export const generatedResumeSchema = profileSchema.extend({
  skills: z.array(z.string()).default([]),
  experience: z.array(experienceSchema).default([]),
  projects: z.array(projectSchema).default([]),
  education: z.array(educationSchema).default([]),
});
