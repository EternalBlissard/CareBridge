import type OpenAI from "openai";
import { buildPatientSchedule } from "../../rules/patient-schedule.js";
import type { PatientViewSource } from "../../shared/api.js";
import type { PatientCard, PatientStory } from "../../shared/types.js";
import { PATIENT_DEGRADED_MSG } from "../errors.js";
import { createLlmClient, PARSE_MODEL } from "../llm/client.js";
import {
  getCachedPatientRewrite,
  patientCacheKey,
  setCachedPatientRewrite,
} from "./cache.js";
import {
  buildPatientRepairPrompt,
  buildPatientUserPrompt,
  PATIENT_PROMPT_VERSION,
  PATIENT_SYSTEM_PROMPT,
} from "./prompt.js";
import { LlmPatientRewriteSchema, type LlmPatientRewrite } from "./schemas.js";

export type PatientViewResult = {
  cards: PatientCard[];
  schedule: ReturnType<typeof buildPatientSchedule>;
  source: PatientViewSource;
  warning?: string;
};

function storyJson(story: PatientStory): string {
  return JSON.stringify(story);
}

function buildSafetyCards(story: PatientStory): PatientCard[] {
  const cards: PatientCard[] = [];

  for (const flag of story.redFlags) {
    cards.push({
      id: flag.id,
      kind: "safety",
      title: "Important symptom to discuss with your care team",
      body: flag.message,
      provenance: "deterministic-rule",
      severityLabel: flag.urgency,
      ruleId: flag.ruleId,
    });
  }

  for (const ix of story.interactions) {
    const plainSeverity =
      ix.severity === "major"
        ? "serious"
        : ix.severity === "moderate"
          ? "moderate"
          : "minor";
    cards.push({
      id: `ix-${ix.ruleId}`,
      kind: "interaction",
      title: `Medication combination note (${plainSeverity})`,
      body: `${ix.drugA} and ${ix.drugB} may interact. ${ix.mechanism}${
        ix.management ? ` ${ix.management}` : ""
      }`,
      provenance: "deterministic-rule",
      severityLabel: ix.severity,
      ruleId: ix.ruleId,
    });
  }

  return cards;
}

function buildTemplateRewrite(story: PatientStory): LlmPatientRewrite {
  const symptomList = story.symptoms.map((s) => s.term).join(", ");
  return {
    overview:
      `You shared information about ${symptomList || "your health"}. ` +
      `You are taking ${story.medications.length} medication(s). ` +
      "This summary is for understanding only — it is not medical advice.",
    symptomCards: story.symptoms.map((s) => ({
      id: `symptom-${s.normalizedTerm}`,
      title: s.term,
      body: s.onset
        ? `You reported ${s.term}, starting ${s.onset}.`
        : `You reported ${s.term}.`,
    })),
    medicationCards: story.medications.map((m) => ({
      id: `med-${m.normalizedName}`,
      title: m.name,
      body: [
        m.dose ? `Dose: ${m.dose}.` : null,
        m.frequency ? `How often: ${m.frequency}.` : "Talk with your care team about how to take this.",
      ]
        .filter(Boolean)
        .join(" "),
    })),
  };
}

function mergeRewrite(story: PatientStory, rewrite: LlmPatientRewrite): PatientCard[] {
  const cards: PatientCard[] = [
    {
      id: "overview",
      kind: "overview",
      title: "Your health story in plain language",
      body: rewrite.overview,
      provenance: "ai-generated",
    },
    ...rewrite.symptomCards.map((c) => ({
      id: c.id,
      kind: "symptom" as const,
      title: c.title,
      body: c.body,
      provenance: "ai-generated" as const,
    })),
    ...rewrite.medicationCards.map((c) => ({
      id: c.id,
      kind: "medication" as const,
      title: c.title,
      body: c.body,
      provenance: "ai-generated" as const,
    })),
  ];

  const visits = story.timeline.filter((e) => e.type.toLowerCase() === "visit");
  for (const visit of visits) {
    cards.push({
      id: visit.id,
      kind: "visit",
      title: "Care visit",
      body: visit.timeRef ? `${visit.label} (${visit.timeRef})` : visit.label,
      provenance: "deterministic-rule",
    });
  }

  cards.push(...buildSafetyCards(story));
  return cards;
}

async function callLlm(client: OpenAI, userContent: string): Promise<string | null> {
  const res = await client.chat.completions.create({
    model: PARSE_MODEL,
    messages: [
      { role: "system", content: PATIENT_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
  });
  return res.choices[0]?.message?.content ?? null;
}

function tryValidateJson(raw: string): {
  ok: true;
  data: LlmPatientRewrite;
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
  const result = LlmPatientRewriteSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, data: result.data };
}

export async function buildPatientView(story: PatientStory): Promise<PatientViewResult> {
  const schedule = buildPatientSchedule(story);
  const json = storyJson(story);
  const cacheKey = patientCacheKey(PATIENT_PROMPT_VERSION, PARSE_MODEL, json);

  const cached = getCachedPatientRewrite(cacheKey);
  if (cached) {
    return {
      cards: mergeRewrite(story, cached),
      schedule,
      source: "llm-cache",
    };
  }

  let client: OpenAI;
  try {
    client = createLlmClient();
  } catch {
    const template = buildTemplateRewrite(story);
    return {
      cards: mergeRewrite(story, template),
      schedule,
      source: "template",
      warning: PATIENT_DEGRADED_MSG,
    };
  }

  try {
    const raw = await callLlm(client, buildPatientUserPrompt(json));
    if (!raw) throw new Error("Empty LLM response");

    const first = tryValidateJson(raw);
    if (first.ok) {
      setCachedPatientRewrite(cacheKey, first.data);
      return {
        cards: mergeRewrite(story, first.data),
        schedule,
        source: "llm",
      };
    }

    const repairRaw = await callLlm(
      client,
      buildPatientRepairPrompt(json, raw, first.error),
    );
    if (repairRaw) {
      const repaired = tryValidateJson(repairRaw);
      if (repaired.ok) {
        setCachedPatientRewrite(cacheKey, repaired.data);
        return {
          cards: mergeRewrite(story, repaired.data),
          schedule,
          source: "llm",
        };
      }
    }
  } catch {
    const template = buildTemplateRewrite(story);
    return {
      cards: mergeRewrite(story, template),
      schedule,
      source: "template",
      warning: PATIENT_DEGRADED_MSG,
    };
  }

  const template = buildTemplateRewrite(story);
  return {
    cards: mergeRewrite(story, template),
    schedule,
    source: "template",
    warning: PATIENT_DEGRADED_MSG,
  };
}
