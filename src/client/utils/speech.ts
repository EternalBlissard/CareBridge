import type { PatientCard, ScheduleEntry } from "@shared/types";

/** Chrome truncates utterances around 200–250 chars — stay under 200. */
export const UTTERANCE_MAX_CHARS = 200;

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Split text into chunks at word boundaries, each under maxLen. */
export function splitIntoUtterances(text: string, maxLen = UTTERANCE_MAX_CHARS): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  if (normalized.length <= maxLen) return [normalized];

  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf(" ", maxLen);
    if (cut < maxLen * 0.5) cut = maxLen;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

let cachedVoice: SpeechSynthesisVoice | null = null;

export function pickLocalVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;

  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return cachedVoice;

  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = english.length > 0 ? english : voices;

  const local =
    pool.find((v) => v.localService) ??
    pool.find((v) => !/google|microsoft.*online|cloud/i.test(v.name)) ??
    pool[0];

  cachedVoice = local ?? null;
  return cachedVoice;
}

const KIND_NARRATION: Record<PatientCard["kind"], string> = {
  overview: "Overview",
  symptom: "Symptom",
  medication: "Medication",
  safety: "Safety alert",
  interaction: "Medication safety",
  visit: "Care visit",
};

export function cardToSpeechText(card: PatientCard): string {
  const kind = KIND_NARRATION[card.kind];
  const severity = card.severityLabel ? `, ${card.severityLabel} priority` : "";
  return `${kind}${severity}. ${card.title}. ${card.body}`;
}

export function scheduleToSpeechText(schedule: ScheduleEntry[]): string {
  if (schedule.length === 0) return "";

  const slots = schedule.map((slot) => {
    const items = slot.items
      .map((item) => (item.detail ? `${item.label}, ${item.detail}` : item.label))
      .join("; ");
    return `${slot.timeLabel}: ${items}`;
  });

  return `Your schedule. ${slots.join(". ")}`;
}

export function allCardsSpeechText(cards: PatientCard[], schedule: ScheduleEntry[]): string {
  const parts = cards.map(cardToSpeechText);
  const scheduleText = scheduleToSpeechText(schedule);
  if (scheduleText) parts.push(scheduleText);
  return parts.join(" ");
}
