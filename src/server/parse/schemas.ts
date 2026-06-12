import { z } from "zod";

/** Raw LLM output — no provenance fields; those are added after validation. */
export const LlmTimelineEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  label: z.string().min(1),
  timeRef: z.string().optional(),
  severityHint: z.string().optional(),
  sourceSpan: z.string().optional(),
});

export const LlmMedicationSchema = z.object({
  name: z.string().min(1),
  normalizedName: z.string().min(1),
  rxnormHint: z.string().optional(),
  atcCode: z.string().optional(),
  dose: z.string().optional(),
  frequency: z.string().optional(),
  sourceSpan: z.string().optional(),
});

export const LlmSymptomSchema = z.object({
  term: z.string().min(1),
  normalizedTerm: z.string().min(1),
  bodySystem: z.string().optional(),
  onset: z.string().optional(),
});

export const LlmParseResultSchema = z.object({
  timeline: z.array(LlmTimelineEventSchema),
  medications: z.array(LlmMedicationSchema),
  symptoms: z.array(LlmSymptomSchema),
});

export type LlmParseResult = z.infer<typeof LlmParseResultSchema>;

export const ParseRequestSchema = z.object({
  text: z.string().min(1).max(32_000),
});
