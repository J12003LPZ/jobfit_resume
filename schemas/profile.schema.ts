import { z } from "zod";

export const contactSchema = z.object({
  email: z.string(),
  phone: z.string().optional(),
  location: z.string(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
  linkedin: z.string().optional(),
});

export const experienceSchema = z.object({
  company: z.string(),
  location: z.string().optional(),
  role: z.string(),
  dates: z.string(),
  bullets: z.array(z.string()),
});

export const projectSchema = z.object({
  name: z.string(),
  technologies: z.array(z.string()),
  bullets: z.array(z.string()),
});

export const educationSchema = z.object({
  school: z.string(),
  location: z.string().optional(),
  degree: z.string(),
  dates: z.string().optional(),
  gpa: z.string().optional(),
  honors: z.array(z.string()).optional(),
});

export const profileSchema = z.object({
  name: z.string(),
  title: z.string(),
  contact: contactSchema,
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(experienceSchema),
  projects: z.array(projectSchema),
  education: z.array(educationSchema),
});
