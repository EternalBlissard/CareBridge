import type OpenAI from "openai";
import { checkInteractions } from "../../rules/check-interactions.js";
import { enrichStoryWithRedFlags } from "../../rules/detect-red-flags.js";
import type { PatientStory } from "../../shared/types.js";
import { createLlmClient, PARSE_MODEL } from "../llm/client.js";
import {
  buildParseUserPrompt,
  buildRepairUserPrompt,
  PARSE_SYSTEM_PROMPT,
} from "./prompt.js";
import {
  LlmParseResultSchema,
  type LlmParseResult,
} from "./schemas.js";
import { skeletonParse } from "./skeleton.js";

/** ~8000-token input cap (conservative chars/token estimate). */
const MAX_INPUT_CHARS = 24_000;

export type ParseSource = "llm" | "llm-repair" | "skeleton";

export type ParseResult = {
  story: PatientStory;
  source: ParseSource;
  warning?: string;
};

function truncateInput(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_INPUT_CHARS) return { text, truncated: false };
  return { text: text.slice(0, MAX_INPUT_CHARS), truncated: true };
}

function toPatientStory(llm: LlmParseResult): Omit<PatientStory, "redFlags" | "interactions"> {
  return {
    timeline: llm.timeline.map((e) => ({ ...e, provenance: "ai-generated" as const })),
    medications: llm.medications.map((m) => ({ ...m, provenance: "ai-generated" as const })),
    symptoms: llm.symptoms.map((s) => ({
      ...s,
      isRedFlag: false,
      provenance: "ai-generated" as const,
    })),
  };
}

function finalizeStory(rawText: string, llm: LlmParseResult): PatientStory {
  const base = toPatientStory(llm);
  const withFlags = enrichStoryWithRedFlags(rawText, base);
  return {
    ...withFlags,
    interactions: checkInteractions(withFlags.medications),
  };
}

async function callLlm(
  client: OpenAI,
  userContent: string,
): Promise<string | null> {
  const res = await client.chat.completions.create({
    model: PARSE_MODEL,
    messages: [
      { role: "system", content: PARSE_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
  });
  return res.choices[0]?.message?.content ?? null;
}

function tryValidateJson(raw: string): {
  ok: true;
  data: LlmParseResult;
} | {
  ok: false;
  error: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Response is not valid JSON" };
  }
  const result = LlmParseResultSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, data: result.data };
}

export async function parseNarrative(rawText: string): Promise<ParseResult> {
  const { text, truncated } = truncateInput(rawText.trim());
  const truncationWarning = truncated
    ? "Input truncated to fit model context limit."
    : undefined;

  let client: OpenAI;
  try {
    client = createLlmClient();
  } catch {
    const skel = skeletonParse(text);
    return {
      story: finalizeStory(text, skel),
      source: "skeleton",
      warning: "AI unavailable — showing structured data from rule-based parse only.",
    };
  }

  try {
    const raw = await callLlm(client, buildParseUserPrompt(text));
    if (!raw) throw new Error("Empty LLM response");

    const first = tryValidateJson(raw);
    if (first.ok) {
      return {
        story: finalizeStory(text, first.data),
        source: "llm",
        warning: truncationWarning,
      };
    }

    const repairRaw = await callLlm(
      client,
      buildRepairUserPrompt(text, raw, first.error),
    );
    if (repairRaw) {
      const repaired = tryValidateJson(repairRaw);
      if (repaired.ok) {
        return {
          story: finalizeStory(text, repaired.data),
          source: "llm-repair",
          warning: truncationWarning,
        };
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "LLM call failed";
    const skel = skeletonParse(text);
    return {
      story: finalizeStory(text, skel),
      source: "skeleton",
      warning: `AI explanation unavailable, showing structured data only. (${msg})`,
    };
  }

  const skel = skeletonParse(text);
  return {
    story: finalizeStory(text, skel),
    source: "skeleton",
    warning: truncationWarning ??
      "AI explanation unavailable, showing structured data only.",
  };
}
