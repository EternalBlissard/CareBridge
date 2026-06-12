export type NarrativeSource = "paste" | "dictation" | "sample";

export type PatientNarrative = {
  id: string;
  rawText: string;
  source: NarrativeSource;
  createdAt: string;
  syntheaPatientId?: string;
  displayName?: string;
  conditions?: string[];
  attribution: string;
};
