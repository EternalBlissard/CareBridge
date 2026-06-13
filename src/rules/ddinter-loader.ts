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

/** RFC 4180-style line parser: quoted fields may contain commas and "" escapes. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"' && current === "") {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCsv(content: string, filename: string): DdiRow[] {
  const lines = content.trim().split(/\r?\n/);
  const header = lines[0] ? parseCsvLine(lines[0]) : [];
  const rows: DdiRow[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line?.trim()) continue;
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    header.forEach((col, idx) => {
      record[col] = values[idx] ?? "";
    });
    const parsed = DdiRowSchema.safeParse(record);
    if (parsed.success) rows.push(parsed.data);
    else skipped++;
  }

  if (skipped > 0) {
    console.warn(`[ddinter] ${filename}: skipped ${skipped} malformed row(s)`);
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
    all.push(...parseCsv(raw, file));
  }
  return all;
}

const rows = loadAllRows();

const lookup = new Map<string, DdiRow>();
for (const row of rows) {
  const key = pairKey(row.drug_a, row.drug_b);
  const existing = lookup.get(key);
  if (existing && existing.rule_id !== row.rule_id) {
    console.warn(
      `[ddinter] duplicate pair ${key}: ${row.rule_id} overrides ${existing.rule_id}`,
    );
  }
  lookup.set(key, row);
}

export const DDINTER_SNAPSHOT = "2026-06-12";
// Hand-curated demo subset informed by DDInter 2.0 — not the DDInter download.
// Swap in the real export (license pending) before claiming DDInter as the source.
export const DDINTER_SOURCE = `Curated DDI subset (DDInter-informed; ATC B01AC + M01AE) snapshot ${DDINTER_SNAPSHOT}`;

export function lookupInteraction(
  drugA: string,
  drugB: string,
): (DdiRow & { severity: InteractionSeverity }) | undefined {
  return lookup.get(pairKey(drugA, drugB));
}

export function getLoadedDdiCount(): number {
  return lookup.size;
}
