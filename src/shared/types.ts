/** Shared data model — used by client renderers and server API. */

export type Provenance = "ai-generated" | "deterministic-rule";

export type Urgency = "immediate" | "urgent" | "soon";

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

export type RedFlag = {
  id: string;
  triggeringTerms: string[];
  rule: string;
  message: string;
  urgency: Urgency;
  provenance: "deterministic-rule";
  ruleId: string;
};

export type PatientStory = {
  timeline: TimelineEvent[];
  medications: Medication[];
  symptoms: Symptom[];
  redFlags: RedFlag[];
};
