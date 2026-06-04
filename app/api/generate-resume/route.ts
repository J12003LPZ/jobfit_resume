import { NextResponse } from "next/server";
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

    // Enforce non-negotiable facts from master profile (defense in depth).
    const resume: Profile = {
      ...parsed,
      name: leonardoProfile.name,
      contact: leonardoProfile.contact,
      experience: parsed.experience.map((e, i) => ({
        ...e,
        company: leonardoProfile.experience[i]?.company ?? e.company,
        role: leonardoProfile.experience[i]?.role ?? e.role,
        dates: leonardoProfile.experience[i]?.dates ?? e.dates,
        location: leonardoProfile.experience[i]?.location ?? e.location,
      })),
      education: leonardoProfile.education,
      skills: removeDuplicates(parsed.skills),
    };

    const validation = validateResume(resume, leonardoProfile);
    return NextResponse.json({ resume, validation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
