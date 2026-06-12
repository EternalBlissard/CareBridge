export const PROMPT_VERSION = "parse-v1";

export const PARSE_SYSTEM_PROMPT = `You are a clinical narrative parser for CareBridge. Extract structure from free-text patient narratives.

RULES (never violate):
- Return valid JSON only — no markdown, no commentary.
- Do NOT diagnose. Do NOT recommend treatment.
- Do NOT assign red-flag status or drug-interaction severity.
- Extract only what is stated or clearly implied in the text.
- Use lowercase normalized names for medications and symptoms.
- Generate stable ids like "evt-1", "evt-2" for timeline events.

Output shape:
{
  "timeline": [{ "id", "type", "label", "timeRef?", "severityHint?", "sourceSpan?" }],
  "medications": [{ "name", "normalizedName", "dose?", "frequency?", "sourceSpan?" }],
  "symptoms": [{ "term", "normalizedTerm", "bodySystem?", "onset?" }]
}

Timeline types: symptom, medication, visit, procedure, history, other.
timeRef: relative phrases from text ("3 days ago", "since Monday").
severityHint: only if the patient describes intensity — never clinical urgency labels.`;

export function buildParseUserPrompt(text: string): string {
  return `Parse this synthetic patient narrative into the JSON schema:\n\n${text}`;
}

export function buildRepairUserPrompt(
  originalText: string,
  invalidJson: string,
  zodError: string,
): string {
  return `The previous JSON failed validation. Fix it and return valid JSON only.

Original narrative:
${originalText}

Invalid JSON:
${invalidJson}

Validation errors:
${zodError}`;
}
