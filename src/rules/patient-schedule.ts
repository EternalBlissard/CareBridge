import type { Medication, PatientStory, ScheduleEntry } from "../shared/types.js";

const SLOT_ORDER: Record<string, number> = {
  Morning: 0,
  Afternoon: 1,
  Evening: 2,
  Bedtime: 3,
  Daily: 4,
  "As needed": 5,
  Appointments: 6,
};

function frequencyToSlots(frequency?: string): string[] {
  if (!frequency) return ["Daily"];
  const f = frequency.toLowerCase();
  if (f.includes("twice") || f.includes("bid") || f.includes("2 times")) {
    return ["Morning", "Evening"];
  }
  if (f.includes("three") || f.includes("tid") || f.includes("3 times")) {
    return ["Morning", "Afternoon", "Evening"];
  }
  if (f.includes("bedtime") || f.includes("at night") || f.includes(" hs")) {
    return ["Bedtime"];
  }
  if (f.includes("as needed") || f.includes("prn")) {
    return ["As needed"];
  }
  if (f.includes("once") || f.includes("daily") || f.includes("qd")) {
    return ["Morning"];
  }
  return ["Daily"];
}

function medLabel(med: Medication): string {
  const parts = [med.name];
  if (med.dose) parts.push(med.dose);
  return parts.join(" ");
}

export function buildPatientSchedule(story: PatientStory): ScheduleEntry[] {
  const buckets = new Map<string, ScheduleEntry["items"]>();

  for (const med of story.medications) {
    const slots = frequencyToSlots(med.frequency);
    const detail = [med.dose, med.frequency].filter(Boolean).join(" · ") || undefined;
    for (const slot of slots) {
      const existing = buckets.get(slot) ?? [];
      existing.push({ label: medLabel(med), detail });
      buckets.set(slot, existing);
    }
  }

  const visits = story.timeline.filter((e) => e.type.toLowerCase() === "visit");
  if (visits.length > 0) {
    buckets.set(
      "Appointments",
      visits.map((v) => ({
        label: v.label,
        detail: v.timeRef,
      })),
    );
  }

  return [...buckets.entries()]
    .map(([timeLabel, items]) => ({
      id: `schedule-${timeLabel.toLowerCase().replace(/\s+/g, "-")}`,
      timeLabel,
      sortOrder: SLOT_ORDER[timeLabel] ?? 99,
      items,
      provenance: "deterministic-rule" as const,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
