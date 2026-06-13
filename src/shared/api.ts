import type { PatientStory } from "./types.js";

export type ParseSource = "llm" | "llm-repair" | "llm-cache" | "skeleton";

export type ParseResponse = {
  story: PatientStory;
  source: ParseSource;
  warning?: string;
};
