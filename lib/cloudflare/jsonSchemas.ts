const stringArray = { type: "array", items: { type: "string" } };

export const jobAnalysisJsonSchema = {
  type: "object",
  properties: {
    jobTitle: { type: "string", minLength: 1 },
    companyName: { type: "string" },
    technologies: stringArray,
    hardSkills: stringArray,
    softSkills: stringArray,
    responsibilities: stringArray,
    preferredQualifications: stringArray,
    atsKeywords: stringArray,
  },
  required: ["jobTitle", "technologies", "hardSkills", "softSkills", "responsibilities", "atsKeywords"],
};

const bulletEntry = (extra: Record<string, unknown>) => ({
  type: "object",
  properties: { ...extra, bullets: stringArray },
});

export const generatedResumeJsonSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    title: { type: "string" },
    contact: {
      type: "object",
      properties: {
        email: { type: "string" }, phone: { type: "string" }, location: { type: "string" },
        github: { type: "string" }, portfolio: { type: "string" }, linkedin: { type: "string" },
      },
    },
    summary: { type: "string" },
    skills: stringArray,
    experience: {
      type: "array",
      items: bulletEntry({
        company: { type: "string" }, location: { type: "string" },
        role: { type: "string" }, dates: { type: "string" },
      }),
    },
    projects: {
      type: "array",
      items: bulletEntry({ name: { type: "string" }, technologies: stringArray }),
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          school: { type: "string" }, location: { type: "string" }, degree: { type: "string" },
          dates: { type: "string" }, gpa: { type: "string" }, honors: stringArray,
        },
      },
    },
  },
  required: ["name", "title", "contact", "summary", "skills", "experience", "education"],
};

export const coverLetterContentJsonSchema = {
  type: "object",
  properties: {
    greeting: { type: "string" },
    opening: { type: "string" },
    body: stringArray,
    closing: { type: "string" },
  },
  required: ["opening", "body", "closing"],
};
