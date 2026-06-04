export type ContactInfo = {
  email: string;
  phone?: string;
  location: string;
  github?: string;
  portfolio?: string;
  linkedin?: string;
};

export type ExperienceEntry = {
  company: string;
  location?: string;
  role: string;
  dates: string;
  bullets: string[];
};

export type ProjectEntry = {
  name: string;
  technologies: string[];
  bullets: string[];
};

export type EducationEntry = {
  school: string;
  location?: string;
  degree: string;
  dates?: string;
  gpa?: string;
  honors?: string[];
};

export type Profile = {
  name: string;
  title: string;
  contact: ContactInfo;
  summary: string;
  skills: string[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  education: EducationEntry[];
};
