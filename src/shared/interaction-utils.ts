import type { Interaction, Medication } from "./types.js";

function normalizeDrug(name: string): string {
  return name.toLowerCase().trim();
}

export function interactionsForMed(
  med: Medication,
  interactions: Interaction[],
): Interaction[] {
  const name = normalizeDrug(med.normalizedName);
  return interactions.filter((i) => i.drugA === name || i.drugB === name);
}

export function otherDrugInInteraction(
  med: Medication,
  interaction: Interaction,
): string {
  const name = normalizeDrug(med.normalizedName);
  return interaction.drugA === name ? interaction.drugB : interaction.drugA;
}
