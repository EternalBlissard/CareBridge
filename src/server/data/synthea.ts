import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PatientNarrative } from "../../shared/narrative.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../../data/synthea");

const FIXTURE_FILES = readdirSync(DATA_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

function loadFixture(filename: string): PatientNarrative {
  const raw = readFileSync(join(DATA_DIR, filename), "utf-8");
  return JSON.parse(raw) as PatientNarrative;
}

const fixtures = new Map<string, PatientNarrative>(
  FIXTURE_FILES.map((f) => {
    const narrative = loadFixture(f);
    return [narrative.id, narrative];
  }),
);

export function listSyntheticPatients(): Pick<
  PatientNarrative,
  "id" | "displayName" | "attribution" | "syntheaPatientId"
>[] {
  return [...fixtures.values()].map(
    ({ id, displayName, attribution, syntheaPatientId }) => ({
      id,
      displayName,
      attribution,
      syntheaPatientId,
    }),
  );
}

export function getSyntheticPatient(id: string): PatientNarrative | undefined {
  return fixtures.get(id);
}

export function getDefaultSyntheticPatient(): PatientNarrative {
  const first = fixtures.values().next().value;
  if (!first) throw new Error("No Synthea fixtures loaded");
  return first;
}
