import type { LlmParseResult } from "./schemas.js";

const SYMPTOM_TERMS = [
  "chest pain",
  "shortness of breath",
  "dyspnea",
  "fever",
  "headache",
  "nausea",
  "vomiting",
  "dizziness",
  "fatigue",
  "cough",
  "swelling",
  "bleeding",
  "palpitations",
  "abdominal pain",
  "back pain",
];

const MED_PATTERNS = [
  /\b(?:taking|on|uses?|prescribed)\s+([A-Za-z][\w-]+(?:\s+[A-Za-z][\w-]+)?)(?:\s+(\d+\s*(?:mg|mcg|g|units?)(?:\s*(?:daily|twice|once|bid|tid|qid))?))?/gi,
  /\b([A-Za-z][\w-]+)\s+(\d+\s*(?:mg|mcg|g))\b/g,
];

function normalizeTerm(s: string): string {
  return s.trim().toLowerCase();
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

function extractSymptoms(text: string, lower: string): LlmParseResult["symptoms"] {
  const found = new Set<string>();
  for (const term of SYMPTOM_TERMS) {
    if (lower.includes(term)) found.add(term);
  }
  return [...found].map((term) => ({
    term,
    normalizedTerm: term,
    bodySystem: undefined,
    onset: undefined,
  }));
}

function extractMedications(text: string): LlmParseResult["medications"] {
  const meds: LlmParseResult["medications"] = [];
  const seen = new Set<string>();

  for (const pattern of MED_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1]?.trim();
      if (!name || name.length < 3) continue;
      const key = normalizeTerm(name);
      if (seen.has(key)) continue;
      seen.add(key);
      meds.push({
        name,
        normalizedName: key,
        dose: match[2]?.trim(),
        frequency: undefined,
        sourceSpan: match[0],
      });
    }
  }
  return meds;
}

/** Deterministic regex skeleton — UI never hard-fails. */
export function skeletonParse(text: string): LlmParseResult {
  const lower = text.toLowerCase();
  const sentences = splitSentences(text);

  const timeline: LlmParseResult["timeline"] = sentences.map((sentence, i) => {
    const label = sentence.replace(/[.!?]+$/, "");
    let type = "other";
    if (/\b(taking|medication|prescribed|mg|tablet)\b/i.test(sentence)) type = "medication";
    else if (/\b(pain|fever|cough|nausea|symptom|feel)\b/i.test(sentence)) type = "symptom";
    else if (/\b(visit|clinic|hospital|er|emergency|doctor)\b/i.test(sentence)) type = "visit";

    const timeMatch = sentence.match(
      /\b(\d+\s+(?:days?|weeks?|months?|hours?)\s+ago|since\s+\w+|yesterday|today|this\s+morning)\b/i,
    );

    return {
      id: `evt-skel-${i + 1}`,
      type,
      label,
      timeRef: timeMatch?.[0],
      severityHint: undefined,
      sourceSpan: sentence,
    };
  });

  if (timeline.length === 0) {
    timeline.push({
      id: "evt-skel-1",
      type: "other",
      label: text.slice(0, 120).trim(),
      sourceSpan: text.slice(0, 120),
    });
  }

  return {
    timeline,
    medications: extractMedications(text),
    symptoms: extractSymptoms(text, lower),
  };
}
