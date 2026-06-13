import type {
  ClinicianBrief,
  FollowUpQuestion,
  Interaction,
  PatientStory,
  RedFlag,
  Symptom,
} from "../shared/types.js";

const RED_FLAG_QUESTIONS: Record<string, string[]> = {
  "rf-chest-pain": [
    "Can you describe the chest discomfort — location, radiation, and what makes it better or worse?",
    "Any associated nausea, sweating, or arm or jaw discomfort?",
  ],
  "rf-dyspnea": [
    "How many flights of stairs can you climb before needing to stop for breath?",
    "Any cough, fever, leg swelling, or recent travel?",
  ],
  "rf-syncope": [
    "How many episodes of passing out or near-fainting have occurred, and what were you doing?",
    "Any palpitations, chest pain, or neurologic symptoms before the episode?",
  ],
  "rf-stroke": [
    "When did weakness, speech change, or facial droop begin?",
    "Are symptoms constant or improving?",
  ],
  "rf-severe-headache": [
    "Was the headache sudden and maximal at onset?",
    "Any neck stiffness, fever, or vision changes?",
  ],
  "rf-hematemesis": [
    "How much blood was in the vomit, and how many episodes?",
    "Any dizziness, lightheadedness, or use of blood thinners?",
  ],
  "rf-melena": [
    "Any black or tarry stools, or visible rectal bleeding?",
    "Any dizziness, weakness, or abdominal pain?",
  ],
  "rf-anaphylaxis": [
    "Any throat or tongue swelling, rash, or wheezing?",
    "Any known allergies or recent new medications or foods?",
  ],
  "rf-suicidal": [
    "Are you having thoughts of harming yourself right now?",
    "Do you have a plan, means, or intent — and is anyone with you for support?",
  ],
  "rf-vision-loss": [
    "Is the vision change in one or both eyes, and was onset sudden?",
    "Any eye pain, headache, or neurologic symptoms?",
  ],
  "rf-meningitis": [
    "Do you have fever with neck stiffness or sensitivity to light?",
    "Any recent illness or sick contacts?",
  ],
  "rf-palpitations-syncope": [
    "How long do palpitations last, and do they occur with standing?",
    "Any chest pain or presyncope during episodes?",
  ],
  "rf-severe-abdominal": [
    "Where is the pain located, and is it constant or colicky?",
    "Any vomiting, fever, or inability to pass stool or gas?",
  ],
  "rf-orthopnea": [
    "How many pillows do you use at night to breathe comfortably?",
    "Any ankle swelling, weight gain, or worsening shortness of breath when lying flat?",
  ],
  "rf-hemoptysis": [
    "How much blood are you coughing up, and for how long?",
    "Any fever, weight loss, or recent infection?",
  ],
};

const INTERACTION_QUESTIONS: Record<string, string[]> = {
  major: [
    "When did you last take both medications together, and at what doses?",
    "Any bruising, bleeding, black stools, or unusual pain since starting or increasing either drug?",
  ],
  moderate: [
    "How often are you taking both medications, and who prescribed each?",
    "Any new side effects since combining these medications?",
  ],
};

function urgencyLabel(count: number, level: string): string {
  return count === 1 ? `1 ${level}` : `${count} ${level}`;
}

function buildSummary(story: PatientStory): string {
  const parts: string[] = [];

  const symptomTerms = story.symptoms.map((s) => s.term).join(", ");
  parts.push(
    `Structured narrative with ${story.symptoms.length} symptom(s)` +
      (symptomTerms ? ` (${symptomTerms})` : "") +
      `, ${story.medications.length} medication(s), and ${story.timeline.length} timeline event(s).`,
  );

  if (story.redFlags.length > 0) {
    const byUrgency = {
      immediate: story.redFlags.filter((f) => f.urgency === "immediate").length,
      urgent: story.redFlags.filter((f) => f.urgency === "urgent").length,
      soon: story.redFlags.filter((f) => f.urgency === "soon").length,
    };
    const urgencyParts = [
      byUrgency.immediate > 0 ? urgencyLabel(byUrgency.immediate, "immediate") : null,
      byUrgency.urgent > 0 ? urgencyLabel(byUrgency.urgent, "urgent") : null,
      byUrgency.soon > 0 ? urgencyLabel(byUrgency.soon, "soon") : null,
    ].filter(Boolean);
    parts.push(
      `Deterministic red-flag rules fired: ${story.redFlags.length} alert(s)` +
        (urgencyParts.length ? ` (${urgencyParts.join(", ")})` : "") +
        ".",
    );
  }

  const majorIx = story.interactions.filter((i) => i.severity === "major");
  if (majorIx.length > 0) {
    const pairs = majorIx.map((i) => `${i.drugA} + ${i.drugB}`).join("; ");
    parts.push(`DDInter flagged ${majorIx.length} major interaction(s): ${pairs}.`);
  } else if (story.interactions.length > 0) {
    parts.push(
      `${story.interactions.length} drug interaction(s) noted (no major severity in bundled lookup).`,
    );
  }

  parts.push(
    "This is structured extraction and rule-based triage only — not a diagnosis or treatment plan.",
  );

  return parts.join(" ");
}

function questionsForRedFlag(flag: RedFlag): FollowUpQuestion[] {
  const templates = RED_FLAG_QUESTIONS[flag.ruleId] ?? [
    `Can you tell me more about: ${flag.triggeringTerms.join(", ")}?`,
    "When did this start, and has it changed since onset?",
  ];

  return templates.map((question, index) => ({
    id: `${flag.ruleId}-q${index + 1}`,
    question,
    rationale: flag.message,
    priority: flag.urgency === "immediate" ? "high" : flag.urgency === "urgent" ? "high" : "medium",
    provenance: "deterministic-rule" as const,
    ruleId: flag.ruleId,
  }));
}

function questionsForInteraction(ix: Interaction): FollowUpQuestion[] {
  const templates =
    INTERACTION_QUESTIONS[ix.severity] ?? INTERACTION_QUESTIONS.moderate ?? [];
  const priority = ix.severity === "major" ? "high" : ix.severity === "moderate" ? "medium" : "low";

  return templates.map((question, index) => ({
    id: `${ix.ruleId}-q${index + 1}`,
    question: question.replace("both medications", `${ix.drugA} and ${ix.drugB}`),
    rationale: `${ix.severity} interaction: ${ix.mechanism}`,
    priority,
    provenance: "deterministic-rule" as const,
    ruleId: ix.ruleId,
  }));
}

function questionsForSymptom(symptom: Symptom): FollowUpQuestion | null {
  if (symptom.onset) return null;
  return {
    id: `symptom-onset-${symptom.normalizedTerm}`,
    question: `When did ${symptom.term} start, and has it been getting better or worse?`,
    rationale: "Onset and trajectory not documented in narrative",
    priority: symptom.isRedFlag ? "high" : "medium",
    provenance: "deterministic-rule",
    ruleId: "symptom-onset-missing",
  };
}

function dedupeQuestions(questions: FollowUpQuestion[]): FollowUpQuestion[] {
  const seen = new Set<string>();
  const priorityOrder = { high: 0, medium: 1, low: 2 } as const;

  return [...questions]
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .filter((q) => {
      const key = q.question.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function buildClinicianBrief(story: PatientStory): ClinicianBrief {
  const questions: FollowUpQuestion[] = [
    ...story.redFlags.flatMap(questionsForRedFlag),
    ...story.interactions.flatMap(questionsForInteraction),
    ...story.symptoms.map(questionsForSymptom).filter((q): q is FollowUpQuestion => q !== null),
  ];

  if (story.medications.length > 1) {
    questions.push({
      id: "med-adherence",
      question: "Are you taking all listed medications as prescribed, including over-the-counter products?",
      rationale: "Polypharmacy — confirm adherence and hidden OTC use",
      priority: story.interactions.length > 0 ? "high" : "medium",
      provenance: "deterministic-rule",
      ruleId: "med-adherence",
    });
  }

  return {
    summary: buildSummary(story),
    followUpQuestions: dedupeQuestions(questions),
  };
}

export const TIMELINE_TYPE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  symptom: { bg: "#fef2f2", border: "#fca5a5", label: "Symptom" },
  medication: { bg: "#eff6ff", border: "#93c5fd", label: "Medication" },
  visit: { bg: "#ecfdf5", border: "#6ee7b7", label: "Visit" },
  procedure: { bg: "#f5f3ff", border: "#c4b5fd", label: "Procedure" },
  history: { bg: "#f8fafc", border: "#cbd5e1", label: "History" },
  other: { bg: "#f9fafb", border: "#d1d5db", label: "Other" },
};

export function timelineTypeStyle(type: string): { bg: string; border: string; label: string } {
  const key = type.toLowerCase();
  return TIMELINE_TYPE_COLORS[key] ?? TIMELINE_TYPE_COLORS.other!;
}
