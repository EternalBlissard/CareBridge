/** Shared data model — used by client renderers and server API. */

export type Provenance = "ai-generated" | "deterministic-rule";

export type TimelineEvent = {
  id: string;
  type: string;
  label: string;
  timeRef?: string;
  severityHint?: string;
  sourceSpan?: string;
  provenance: Provenance;
};

export type Medication = {
  name: string;
  normalizedName: string;
  rxnormHint?: string;
  atcCode?: string;
  dose?: string;
  frequency?: string;
  sourceSpan?: string;
  provenance: Provenance;
};

export type Symptom = {
  term: string;
  normalizedTerm: string;
  bodySystem?: string;
  onset?: string;
  isRedFlag: boolean;
  provenance: Provenance;
};

export type PatientStory = {
  timeline: TimelineEvent[];
  medications: Medication[];
  symptoms: Symptom[];
};
