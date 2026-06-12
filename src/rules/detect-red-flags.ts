import type { PatientStory, RedFlag, Symptom } from "../shared/types.js";
import { RED_FLAG_RULES, type RedFlagRuleDef } from "./red-flag-rules.js";

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

const NEGATION_BEFORE_TERM =
  /\b(?:denies?|denied|without|negative for|ruled out|no evidence of)\s*$/i;

function isNegated(haystack: string, termIndex: number): boolean {
  const before = haystack.slice(Math.max(0, termIndex - 40), termIndex);
  return NEGATION_BEFORE_TERM.test(before) || /\bno\s+\w*\s*$/i.test(before);
}

function termMatches(haystack: string, term: string): boolean {
  const n = normalize(term);
  if (n.length < 3) return false;

  let idx = 0;
  while ((idx = haystack.indexOf(n, idx)) !== -1) {
    if (!isNegated(haystack, idx)) return true;
    idx += n.length;
  }
  return false;
}

function findTriggeredTerms(haystack: string, rule: RedFlagRuleDef): string[] {
  return rule.terms.filter((t) => termMatches(haystack, t));
}

function symptomMatchesRule(symptom: Symptom, rule: RedFlagRuleDef): boolean {
  const s = normalize(symptom.normalizedTerm);
  return rule.terms.some(
    (t) => s.includes(normalize(t)) || normalize(t).includes(s),
  );
}

export function detectRedFlags(
  rawText: string,
  story: Omit<PatientStory, "redFlags">,
): RedFlag[] {
  const haystack = normalize(rawText);
  const symptomText = story.symptoms.map((s) => normalize(s.normalizedTerm)).join(" ");
  const combined = `${haystack} ${symptomText}`;

  const flags: RedFlag[] = [];

  for (const rule of RED_FLAG_RULES) {
    const fromNarrative = findTriggeredTerms(haystack, rule);
    const fromSymptoms = story.symptoms
      .filter((s) => symptomMatchesRule(s, rule))
      .map((s) => s.normalizedTerm);
    const triggeringTerms = [...new Set([...fromNarrative, ...fromSymptoms])];

    if (triggeringTerms.length === 0) continue;

    flags.push({
      id: `flag-${rule.ruleId}`,
      ruleId: rule.ruleId,
      triggeringTerms,
      rule: rule.rule,
      message: rule.message,
      urgency: rule.urgency,
      provenance: "deterministic-rule",
    });
  }

  const urgencyOrder = { immediate: 0, urgent: 1, soon: 2 } as const;
  return flags.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
}

export function applyRedFlagsToStory(
  story: Omit<PatientStory, "redFlags">,
  redFlags: RedFlag[],
): PatientStory {
  const matchedRuleIds = new Set(redFlags.map((f) => f.ruleId));

  const symptoms = story.symptoms.map((s) => {
    const isRedFlag = RED_FLAG_RULES.some(
      (rule) => matchedRuleIds.has(rule.ruleId) && symptomMatchesRule(s, rule),
    );
    return { ...s, isRedFlag };
  });

  return { ...story, symptoms, redFlags };
}

export function enrichStoryWithRedFlags(
  rawText: string,
  story: Omit<PatientStory, "redFlags">,
): PatientStory {
  const redFlags = detectRedFlags(rawText, story);
  return applyRedFlagsToStory(story, redFlags);
}
