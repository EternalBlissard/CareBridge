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

// Microsoft Foundry IQ — agentic knowledge retrieval over the openFDA labels.
// "foundry-iq" = grounded answer from the knowledge base; "fallback-fda" = the
// deterministic cached label excerpt shown when Foundry IQ is off/unavailable.
export type GroundedSource = "foundry-iq" | "fallback-fda" | "unavailable";

export type GroundedCitation = {
  /** Source document the answer was grounded in (e.g. the FDA label file). */
  title: string;
  /** Optional supporting snippet returned by the retrieval engine. */
  snippet?: string;
};

export type GroundedDrugInfoResponse = {
  answer: string;
  citations: GroundedCitation[];
  source: GroundedSource;
  attribution: string;
  warning?: string;
};
