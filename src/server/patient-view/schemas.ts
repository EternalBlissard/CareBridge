import { z } from "zod";
import type { PatientStory } from "../../shared/types.js";

export const PatientViewRequestSchema = z.object({
  story: z.custom<PatientStory>(),
});

export const LlmPatientCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
});

export const LlmPatientRewriteSchema = z.object({
  overview: z.string().min(1),
  symptomCards: z.array(LlmPatientCardSchema),
  medicationCards: z.array(LlmPatientCardSchema),
});

export type LlmPatientRewrite = z.infer<typeof LlmPatientRewriteSchema>;
