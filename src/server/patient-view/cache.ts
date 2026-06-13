import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LlmPatientRewriteSchema, type LlmPatientRewrite } from "./schemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "../../../.cache/llm-patient");

const memory = new Map<string, LlmPatientRewrite>();

export function patientCacheKey(
  promptVersion: string,
  model: string,
  storyJson: string,
): string {
  return createHash("sha256")
    .update(`${promptVersion}|${model}|${storyJson}`)
    .digest("hex");
}

export function getCachedPatientRewrite(key: string): LlmPatientRewrite | undefined {
  const hit = memory.get(key);
  if (hit) return hit;

  const file = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(file)) return undefined;
  try {
    const parsed = LlmPatientRewriteSchema.safeParse(
      JSON.parse(readFileSync(file, "utf-8")),
    );
    if (!parsed.success) return undefined;
    memory.set(key, parsed.data);
    return parsed.data;
  } catch {
    return undefined;
  }
}

export function setCachedPatientRewrite(key: string, value: LlmPatientRewrite): void {
  memory.set(key, value);
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(value));
  } catch {
    // Disk persistence is best-effort.
  }
}
