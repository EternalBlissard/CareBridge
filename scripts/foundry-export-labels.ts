/**
 * Export cached openFDA drug labels into Markdown docs for a Foundry IQ
 * knowledge source. Each .cache/openfda/<drug>.json becomes
 * data/foundry-knowledge/<drug>.md — clean, citable label text that the
 * Foundry IQ agentic-retrieval engine indexes and cites in grounded answers.
 *
 * Run: npm run foundry:export
 * Then upload data/foundry-knowledge/*.md to your knowledge source (Blob container).
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const CACHE_DIR = resolve(".cache/openfda");
const OUT_DIR = resolve("data/foundry-knowledge");

interface CachedLabel {
  data?: {
    drugName?: string;
    genericNames?: string[];
    brandNames?: string[];
    interactionTexts?: string[];
    excerpt?: string;
  };
}

function toMarkdown(d: NonNullable<CachedLabel["data"]>): string {
  const title = d.drugName ? d.drugName[0].toUpperCase() + d.drugName.slice(1) : "Unknown drug";
  const generic = d.genericNames?.length ? d.genericNames.join(", ") : "—";
  const brand = d.brandNames?.length ? d.brandNames.join(", ") : "—";
  const interactions = d.interactionTexts?.length
    ? d.interactionTexts.join("\n\n")
    : (d.excerpt ?? "No interaction text on file.");
  return [
    `# ${title}`,
    ``,
    `**Generic names:** ${generic}`,
    `**Brand names:** ${brand}`,
    `**Source:** openFDA Drug Label API (api.fda.gov) — public-domain FDA data.`,
    ``,
    `## Drug interactions (FDA label)`,
    ``,
    interactions,
    ``,
  ].join("\n");
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const files = readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.error(`No cached labels in ${CACHE_DIR}. Run "npm run prewarm" first.`);
    process.exit(1);
  }
  let written = 0;
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(join(CACHE_DIR, file), "utf8")) as CachedLabel;
    if (!parsed.data?.drugName) {
      console.warn(`Skipping ${file}: no data.drugName`);
      continue;
    }
    writeFileSync(join(OUT_DIR, `${parsed.data.drugName}.md`), toMarkdown(parsed.data), "utf8");
    written++;
  }
  console.log(`Exported ${written} label doc(s) → ${OUT_DIR}`);
  console.log(`Next: upload data/foundry-knowledge/*.md to your Foundry IQ knowledge source.`);
}

main();
