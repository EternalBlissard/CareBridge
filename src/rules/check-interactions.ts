import { DDINTER_SOURCE, lookupInteraction } from "./ddinter-loader.js";
import type { Interaction, Medication } from "../shared/types.js";

export { interactionsForMed, otherDrugInInteraction } from "../shared/interaction-utils.js";

function normalizeDrug(name: string): string {
  return name.toLowerCase().trim();
}

export function checkInteractions(medications: Medication[]): Interaction[] {
  const names = [...new Set(medications.map((m) => normalizeDrug(m.normalizedName)))];
  const found: Interaction[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i]!;
      const b = names[j]!;
      const row = lookupInteraction(a, b);
      if (!row) continue;

      const key = [a, b].sort().join("::");
      if (seen.has(key)) continue;
      seen.add(key);

      found.push({
        drugA: a,
        drugB: b,
        severity: row.severity,
        mechanism: row.mechanism,
        management: row.management,
        source: DDINTER_SOURCE,
        ruleId: row.rule_id,
        provenance: "deterministic-rule",
      });
    }
  }

  const severityOrder = { major: 0, moderate: 1, minor: 2 } as const;
  return found.sort((x, y) => severityOrder[x.severity] - severityOrder[y.severity]);
}
