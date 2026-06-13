/** Shared data model — used by client renderers and server API. */

export type Provenance = "ai-generated" | "deterministic-rule";

export type Urgency = "immediate" | "urgent" | "soon";

export type InteractionSeverity = "major" | "moderate" | "minor";

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

export type Interaction = {
  drugA: string;
  drugB: string;
  severity: InteractionSeverity;
  mechanism: string;
  management?: string;
  source: string;
  ruleId: string;
  provenance: "deterministic-rule";
};

export type PatientStory = {
  timeline: TimelineEvent[];
  medications: Medication[];
  symptoms: Symptom[];
  redFlags: RedFlag[];
  interactions: Interaction[];
};

export type FollowUpPriority = "high" | "medium" | "low";

export type FollowUpQuestion = {
  id: string;
  question: string;
  rationale: string;
  priority: FollowUpPriority;
  provenance: "deterministic-rule";
  ruleId: string;
};

export type ClinicianBrief = {
  summary: string;
  followUpQuestions: FollowUpQuestion[];
};

export type PatientCardKind =
  | "overview"
  | "symptom"
  | "medication"
  | "safety"
  | "interaction"
  | "visit";

export type PatientCard = {
  id: string;
  kind: PatientCardKind;
  title: string;
  body: string;
  provenance: Provenance;
  /** Deterministic severity/urgency — never from LLM */
  severityLabel?: string;
  ruleId?: string;
};

export type ScheduleItem = {
  label: string;
  detail?: string;
};

export type ScheduleEntry = {
  id: string;
  timeLabel: string;
  sortOrder: number;
  items: ScheduleItem[];
  provenance: "deterministic-rule";
};
