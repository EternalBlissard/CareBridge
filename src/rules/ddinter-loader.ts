import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { InteractionSeverity } from "../shared/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data/ddinter");

const DdiRowSchema = z.object({
  drug_a: z.string(),
  drug_b: z.string(),
  severity: z.enum(["major", "moderate", "minor"]),
  mechanism: z.string(),
  management: z.string().optional(),
  rule_id: z.string(),
});

export type DdiRow = z.infer<typeof DdiRowSchema> & { management?: string };

const CSV_FILES = [
  "atc-b01ac-antithrombotics.csv",
  "atc-m01ae-nsaids.csv",
] as const;

function parseCsv(content: string): DdiRow[] {
  const lines = content.trim().split("\n");
  const header = lines[0]?.split(",") ?? [];
  const rows: DdiRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line?.trim()) continue;
    const values = line.split(",");
    const record: Record<string, string> = {};
    header.forEach((col, idx) => {
      record[col] = values[idx] ?? "";
    });
    const parsed = DdiRowSchema.safeParse(record);
    if (parsed.success) rows.push(parsed.data);
  }
  return rows;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("::");
}

function loadAllRows(): DdiRow[] {
  const all: DdiRow[] = [];
  for (const file of CSV_FILES) {
    const raw = readFileSync(join(DATA_DIR, file), "utf-8");
    all.push(...parseCsv(raw));
  }
  return all;
}

const rows = loadAllRows();

const lookup = new Map<string, DdiRow>();
for (const row of rows) {
  lookup.set(pairKey(row.drug_a, row.drug_b), row);
}

export const DDINTER_SNAPSHOT = "2026-06-12";
export const DDINTER_SOURCE = `DDInter subset (ATC B01AC + M01AE) snapshot ${DDINTER_SNAPSHOT}`;

export function lookupInteraction(
  drugA: string,
  drugB: string,
): (DdiRow & { severity: InteractionSeverity }) | undefined {
  return lookup.get(pairKey(drugA, drugB));
}

export function getLoadedDdiCount(): number {
  return lookup.size;
}
