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
import type { CoverLetter, CoverLetterContent } from "@/types/coverLetter";

export const maxDuration = 300;

// Below this coverage score we spend ONE extra AI call trying to weave in the
// keywords the first draft missed. One retry only — bounds latency and cost.
const COVERAGE_TARGET = 70;

// Reassemble the letter: model prose + authoritative facts copied verbatim.
// The model never controls identity, contact, company, or the job title.
function assembleLetter(
  content: CoverLetterContent,
  jobAnalysis: JobAnalysis,
): CoverLetter {
  return {
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
}

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
  const matchedKeywords = body.matchedKeywords ?? [];
  const acceptedGapKeywords = body.acceptedGapKeywords ?? [];

  try {
    const raw = await callWorkersAI<unknown>({
      system: COVER_LETTER_SYSTEM,
      user: coverLetterUser({
        profile: leonardoProfile,
        jobAnalysis,
        matchedKeywords,
        acceptedGapKeywords,
      }),
      jsonSchema: coverLetterContentJsonSchema,
    });

    const content = coverLetterContentSchema.parse(raw);
    let coverLetter = assembleLetter(content, jobAnalysis);
    let coverage = coverLetterCoverage(jobAnalysis, coverLetter);

    // One coverage-driven retry: feed the missing keywords + prior draft back
    // to the model, and keep whichever draft scores higher. Any failure here
    // silently falls back to the first draft.
    if (coverage.coverageScore < COVERAGE_TARGET && coverage.missing.length > 0) {
      try {
        const raw2 = await callWorkersAI<unknown>({
          system: COVER_LETTER_SYSTEM,
          user: coverLetterUser({
            profile: leonardoProfile,
            jobAnalysis,
            matchedKeywords,
            acceptedGapKeywords,
            priorContent: content,
            mustCover: coverage.missing,
          }),
          jsonSchema: coverLetterContentJsonSchema,
        });
        const content2 = coverLetterContentSchema.parse(raw2);
        const letter2 = assembleLetter(content2, jobAnalysis);
        const coverage2 = coverLetterCoverage(jobAnalysis, letter2);
        if (coverage2.coverageScore > coverage.coverageScore) {
          coverLetter = letter2;
          coverage = coverage2;
        }
      } catch {
        // Keep the first draft if the retry fails.
      }
    }

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
