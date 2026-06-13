import type { PatientCard, PatientStory, ScheduleEntry } from "./types.js";

export type ParseSource = "llm" | "llm-repair" | "llm-cache" | "skeleton";

export type ParseResponse = {
  story: PatientStory;
  source: ParseSource;
  warning?: string;
};

export type PatientViewSource = "llm" | "llm-cache" | "template";

export type PatientViewResponse = {
  cards: PatientCard[];
  schedule: ScheduleEntry[];
  source: PatientViewSource;
  warning?: string;
};

export type DrugLabelSource = "openfda" | "openfda-cache" | "unavailable";

export type DrugLabelLookupResult = {
  drugName: string;
  found: boolean;
  genericNames: string[];
  brandNames: string[];
  excerpt: string | null;
  source: DrugLabelSource;
  attribution: string;
  warning?: string;
};

export type DrugLabelsResponse = {
  labels: DrugLabelLookupResult[];
  attribution: string;
  warning?: string;
};
