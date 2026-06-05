import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { callWorkersAI } from "@/lib/cloudflare/callWorkersAI";
import { GENERATE_RESUME_SYSTEM, generateResumeUser } from "@/lib/cloudflare/prompts";
import { generatedResumeJsonSchema } from "@/lib/cloudflare/jsonSchemas";
import { generatedResumeSchema } from "@/schemas/resume.schema";
import { validateResume } from "@/lib/resume/validateResume";
import { removeDuplicates } from "@/lib/utils/removeDuplicates";
import { leonardoProfile } from "@/data/leonardo-profile";
import type { JobAnalysis } from "@/types/job";
import type { Profile } from "@/types/profile";

export const maxDuration = 300;

export async function POST(request: Request) {
  let body: {
    jobAnalysis?: JobAnalysis;
    matchedKeywords?: string[];
    acceptedGapKeywords?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.jobAnalysis || typeof body.jobAnalysis.jobTitle !== "string") {
    return NextResponse.json({ error: "Missing jobAnalysis" }, { status: 400 });
  }

  try {
    const raw = await callWorkersAI<unknown>({
      system: GENERATE_RESUME_SYSTEM,
      user: generateResumeUser({
        profile: leonardoProfile,
        jobAnalysis: body.jobAnalysis,
        matchedKeywords: body.matchedKeywords ?? [],
        acceptedGapKeywords: body.acceptedGapKeywords ?? [],
      }),
      jsonSchema: generatedResumeJsonSchema,
    });

    const parsed = generatedResumeSchema.parse(raw) as Profile;

    // The AI only tailors the professional summary and curates the skills list.
    // Experience, education, projects, and all identity/contact facts are copied
    // verbatim from the master profile — the model never edits them.
    const resume: Profile = {
      name: leonardoProfile.name,
      title: leonardoProfile.title,
      contact: leonardoProfile.contact,
      summary: parsed.summary,
      skills: removeDuplicates(parsed.skills),
      experience: leonardoProfile.experience,
      projects: leonardoProfile.projects,
      education: leonardoProfile.education,
    };

    const validation = validateResume(resume, leonardoProfile);
    return NextResponse.json({ resume, validation });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "The model returned an unexpected resume shape. Please try again." },
        { status: 502 },
      );
    }
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
