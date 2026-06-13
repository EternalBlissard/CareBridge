import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LlmParseResultSchema, type LlmParseResult } from "./schemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "../../../.cache/llm-parse");

const memory = new Map<string, LlmParseResult>();

export function parseCacheKey(
  promptVersion: string,
  model: string,
  text: string,
): string {
  return createHash("sha256")
    .update(`${promptVersion}|${model}|${text}`)
    .digest("hex");
}

export function getCachedParse(key: string): LlmParseResult | undefined {
  const hit = memory.get(key);
  if (hit) return hit;

  const file = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(file)) return undefined;
  try {
    const parsed = LlmParseResultSchema.safeParse(
      JSON.parse(readFileSync(file, "utf-8")),
    );
    if (!parsed.success) return undefined;
    memory.set(key, parsed.data);
    return parsed.data;
  } catch {
    return undefined;
  }
}

export function setCachedParse(key: string, value: LlmParseResult): void {
  memory.set(key, value);
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(value));
  } catch {
    // Disk persistence is best-effort; memory cache already holds the value.
  }
}
