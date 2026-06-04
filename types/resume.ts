import type { JobAnalysis } from "./job";
import type { Profile } from "./profile";

export type GapAnalysis = {
  matchedKeywords: string[];
  gapKeywords: string[];
  similarKeywords: { jobKeyword: string; profileKeyword: string }[];
  matchScore: number;       // current (verified profile only)
  potentialScore: number;   // if all gaps accepted
};

export type GapMode = "accept_all" | "verified_only" | "custom";

export type ResumeSession = {
  jobAnalysis: JobAnalysis;
  matchedKeywords: string[];
  gapKeywords: string[];
  gapMode: GapMode;
  acceptedKeywords: string[];
};

export type GeneratedResume = Profile;
