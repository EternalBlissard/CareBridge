/**
 * Pre-warm LLM + openFDA caches for all bundled Synthea demo narratives.
 * Run once before a live demo so GitHub Models / openFDA are not hit on stage.
 *
 * Usage:
 *   npm run prewarm        — call LLM for any cache miss, warm openFDA
 *   npm run prewarm:check  — report cache status (uses disk cache only, no API)
 *
 * Requires GITHUB_TOKEN in .env for cache misses.
 */
import "dotenv/config";
import { getSyntheticPatient, listSyntheticPatients } from "../src/server/data/synthea.js";
import { PARSE_MODEL } from "../src/server/llm/client.js";
import { lookupDrugLabels } from "../src/server/openfda/service.js";
import { hasCachedParse, parseCacheKey } from "../src/server/parse/cache.js";
import { parseNarrative } from "../src/server/parse/service.js";
import { PROMPT_VERSION } from "../src/server/parse/prompt.js";
import { hasCachedPatientRewrite, patientCacheKey } from "../src/server/patient-view/cache.js";
import { buildPatientView } from "../src/server/patient-view/service.js";
import { PATIENT_PROMPT_VERSION } from "../src/server/patient-view/prompt.js";

const dryRun = process.argv.includes("--dry-run");

type Row = {
  id: string;
  displayName: string;
  parseCached: boolean;
  parseSource: string;
  patientCached: boolean;
  patientSource: string;
};

async function main() {
  const patients = listSyntheticPatients();
  if (patients.length === 0) {
    console.error("No synthetic patients found in data/synthea/");
    process.exit(1);
  }

  console.log(
    dryRun
      ? `Checking cache for ${patients.length} demo narrative(s)…`
      : `Pre-warming cache for ${patients.length} demo narrative(s)…`,
  );
  console.log(`Keys: parse=${PROMPT_VERSION} patient=${PATIENT_PROMPT_VERSION} model=${PARSE_MODEL}\n`);

  const rows: Row[] = [];
  const allDrugs = new Set<string>();

  for (const meta of patients) {
    const patient = getSyntheticPatient(meta.id);
    if (!patient) continue;

    const text = patient.rawText.trim();
    const parseKey = parseCacheKey(PROMPT_VERSION, PARSE_MODEL, text);
    const parseCachedBefore = hasCachedParse(parseKey);

    if (dryRun && !parseCachedBefore) {
      console.log(`  ${meta.id}: parse cache MISS`);
      rows.push({
        id: meta.id,
        displayName: meta.displayName,
        parseCached: false,
        parseSource: "miss",
        patientCached: false,
        patientSource: "miss",
      });
      continue;
    }

    const parseResult = await parseNarrative(text);
    console.log(`  ${meta.id} parse: ${parseResult.source}`);

    for (const med of parseResult.story.medications) {
      allDrugs.add(med.normalizedName);
    }

    const storyJson = JSON.stringify(parseResult.story);
    const patientKey = patientCacheKey(PATIENT_PROMPT_VERSION, PARSE_MODEL, storyJson);
    const patientCachedBefore = hasCachedPatientRewrite(patientKey);

    if (dryRun && !patientCachedBefore) {
      console.log(`  ${meta.id}: patient-view cache MISS`);
      rows.push({
        id: meta.id,
        displayName: meta.displayName,
        parseCached: parseCachedBefore,
        parseSource: parseResult.source,
        patientCached: false,
        patientSource: "miss",
      });
      continue;
    }

    const viewResult = dryRun
      ? await buildPatientView(parseResult.story)
      : await buildPatientView(parseResult.story);
    console.log(`  ${meta.id} patient-view: ${viewResult.source}`);

    rows.push({
      id: meta.id,
      displayName: meta.displayName,
      parseCached: parseCachedBefore || parseResult.source === "llm-cache",
      parseSource: parseResult.source,
      patientCached: patientCachedBefore || viewResult.source === "llm-cache",
      patientSource: viewResult.source,
    });
  }

  if (!dryRun && allDrugs.size > 0) {
    const drugs = [...allDrugs].sort();
    console.log(`\nopenFDA: warming ${drugs.length} unique drug(s)…`);
    const fda = await lookupDrugLabels(drugs, drugs);
    const live = fda.labels.filter((l) => l.source === "openfda").length;
    const cached = fda.labels.filter((l) => l.source === "openfda-cache").length;
    console.log(`  ${live} live fetch, ${cached} from cache`);
    if (fda.warning) console.log(`  warning: ${fda.warning}`);
  }

  console.log("\n--- Summary ---");
  for (const row of rows) {
    const ok =
      (row.parseSource === "llm-cache" || row.parseSource === "llm" || row.parseSource === "llm-repair") &&
      (row.patientSource === "llm-cache" || row.patientSource === "llm");
    console.log(
      `${row.displayName}: parse=${row.parseSource}, patient=${row.patientSource}${ok ? " ✓" : ""}`,
    );
  }

  const ready = rows.every(
    (r) => r.parseSource === "llm-cache" && r.patientSource === "llm-cache",
  );
  const degraded = rows.some(
    (r) => r.parseSource === "skeleton" || r.patientSource === "template",
  );

  if (dryRun) {
    console.log(
      ready
        ? "\nAll narratives cached — live demo uses zero LLM quota."
        : "\nCache incomplete. Run: npm run prewarm",
    );
    process.exit(ready ? 0 : 1);
  }

  if (degraded) {
    console.warn("\nSome narratives used skeleton/template — check GITHUB_TOKEN.");
    process.exit(1);
  }

  console.log("\nPre-warm complete.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
