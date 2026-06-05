import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { callWorkersAI } from "@/lib/cloudflare/callWorkersAI";
import { COVER_LETTER_SYSTEM, coverLetterUser } from "@/lib/cloudflare/prompts";
import { coverLetterContentJsonSchema } from "@/lib/cloudflare/jsonSchemas";
import { coverLetterContentSchema } from "@/schemas/cover-letter.schema";
import { coverLetterCoverage } from "@/lib/matching/coverLetterCoverage";
import { formatLetterDate } from "@/lib/coverLetter/formatLetterDate";
import { buildRecipient } from "@/lib/coverLetter/buildRecipient";
import { leonardoProfile } from "@/data/leonardo-profile";
import type { JobAnalysis } from "@/types/job";
import type { CoverLetter } from "@/types/coverLetter";

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
  const jobAnalysis = body.jobAnalysis;

  try {
    const raw = await callWorkersAI<unknown>({
      system: COVER_LETTER_SYSTEM,
      user: coverLetterUser({
        profile: leonardoProfile,
        jobAnalysis,
        matchedKeywords: body.matchedKeywords ?? [],
        acceptedGapKeywords: body.acceptedGapKeywords ?? [],
      }),
      jsonSchema: coverLetterContentJsonSchema,
    });

    const content = coverLetterContentSchema.parse(raw);

    // Reassemble the letter: model prose + authoritative facts copied verbatim.
    // The model never controls identity, contact, company, or the job title.
    const coverLetter: CoverLetter = {
      candidateName: leonardoProfile.name,
      contact: leonardoProfile.contact,
      date: formatLetterDate(new Date()),
      recipient: buildRecipient(jobAnalysis.companyName),
      jobTitle: jobAnalysis.jobTitle,
      greeting: content.greeting,
      opening: content.opening,
      body: content.body,
      closing: content.closing,
    };

    const coverage = coverLetterCoverage(jobAnalysis, coverLetter);
    return NextResponse.json({ coverLetter, coverage });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "The model returned an unexpected cover-letter shape. Please try again." },
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
