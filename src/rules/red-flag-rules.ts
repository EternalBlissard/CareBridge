import type { Urgency } from "../shared/types.js";

export type RedFlagRuleDef = {
  ruleId: string;
  terms: string[];
  rule: string;
  message: string;
  urgency: Urgency;
};

/**
 * Curated symptom-term → urgency map. Deterministic only — never LLM.
 * ~15 clinically referenced red-flag patterns for demo narratives.
 */
export const RED_FLAG_RULES: RedFlagRuleDef[] = [
  {
    ruleId: "rf-chest-pain",
    terms: ["chest pain", "chest tightness", "chest pressure", "crushing chest"],
    rule: "Chest pain or pressure may indicate acute coronary syndrome",
    message: "Chest pain or tightness reported — consider urgent cardiac evaluation",
    urgency: "urgent",
  },
  {
    ruleId: "rf-dyspnea",
    terms: ["shortness of breath", "difficulty breathing", "dyspnea", "can't breathe", "cannot breathe"],
    rule: "Acute dyspnea may indicate cardiopulmonary emergency",
    message: "Shortness of breath reported — assess airway and oxygenation promptly",
    urgency: "urgent",
  },
  {
    ruleId: "rf-syncope",
    terms: ["syncope", "passed out", "fainting", "lost consciousness", "blacked out"],
    rule: "Syncope requires evaluation for cardiac or neurologic cause",
    message: "Loss of consciousness reported — evaluate for serious underlying cause",
    urgency: "immediate",
  },
  {
    ruleId: "rf-stroke",
    terms: ["facial droop", "slurred speech", "one-sided weakness", "sudden numbness", "sudden confusion"],
    rule: "FAST stroke symptoms — time-critical evaluation",
    message: "Possible stroke symptoms — time-critical neurologic assessment needed",
    urgency: "immediate",
  },
  {
    ruleId: "rf-severe-headache",
    terms: ["worst headache", "thunderclap headache", "sudden severe headache"],
    rule: "Sudden severe headache may indicate subarachnoid hemorrhage",
    message: "Sudden severe headache — rule out intracranial emergency",
    urgency: "immediate",
  },
  {
    ruleId: "rf-hematemesis",
    terms: ["vomiting blood", "hematemesis", "blood in vomit"],
    rule: "Upper GI bleeding requires urgent assessment",
    message: "Vomiting blood reported — assess hemodynamic stability",
    urgency: "immediate",
  },
  {
    ruleId: "rf-melena",
    terms: ["blood in stool", "black tarry stool", "melena", "rectal bleeding"],
    rule: "GI bleeding requires urgent evaluation",
    message: "GI bleeding reported — evaluate for significant hemorrhage",
    urgency: "urgent",
  },
  {
    ruleId: "rf-anaphylaxis",
    terms: ["anaphylaxis", "throat swelling", "tongue swelling", "difficulty swallowing with rash"],
    rule: "Anaphylaxis is a medical emergency",
    message: "Possible anaphylaxis — immediate emergency evaluation",
    urgency: "immediate",
  },
  {
    ruleId: "rf-suicidal",
    terms: ["suicidal", "self-harm", "want to die", "kill myself"],
    rule: "Suicidal ideation requires immediate safety assessment",
    message: "Suicidal ideation reported — immediate mental health safety assessment",
    urgency: "immediate",
  },
  {
    ruleId: "rf-vision-loss",
    terms: ["sudden vision loss", "vision loss", "blind in one eye"],
    rule: "Acute vision loss may indicate retinal or neurologic emergency",
    message: "Acute vision change — urgent ophthalmologic or neurologic evaluation",
    urgency: "immediate",
  },
  {
    ruleId: "rf-meningitis",
    terms: ["stiff neck", "neck stiffness with fever", "photophobia with fever"],
    rule: "Meningeal signs with fever suggest CNS infection",
    message: "Meningeal signs with fever — evaluate for CNS infection",
    urgency: "immediate",
  },
  {
    ruleId: "rf-palpitations-syncope",
    terms: ["palpitations with dizziness", "racing heart with faint"],
    rule: "Palpitations with presyncope may indicate arrhythmia",
    message: "Palpitations with dizziness — evaluate for arrhythmia",
    urgency: "urgent",
  },
  {
    ruleId: "rf-severe-abdominal",
    terms: ["severe abdominal pain", "worst abdominal pain", "rigid abdomen"],
    rule: "Severe acute abdominal pain may indicate surgical emergency",
    message: "Severe abdominal pain — evaluate for acute abdomen",
    urgency: "urgent",
  },
  {
    ruleId: "rf-orthopnea",
    terms: ["orthopnea", "worse lying flat", "lying flat at night", "pillows to breathe"],
    rule: "Orthopnea may indicate decompensated heart failure",
    message: "Breathing worse when lying flat — assess for heart failure",
    urgency: "urgent",
  },
  {
    ruleId: "rf-hemoptysis",
    terms: ["coughing blood", "hemoptysis", "blood in sputum"],
    rule: "Hemoptysis requires evaluation for pulmonary or cardiac source",
    message: "Coughing blood reported — evaluate source and severity",
    urgency: "urgent",
  },
];
