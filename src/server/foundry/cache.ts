import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { GroundedDrugInfoResponse } from "../../shared/api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "../../../.cache/foundry-iq");
const CACHE_VERSION = "v1";

const CachedSchema = z.object({
  answer: z.string(),
  citations: z.array(z.object({ title: z.string(), snippet: z.string().optional() })),
  source: z.enum(["foundry-iq", "fallback-fda", "unavailable"]),
  attribution: z.string(),
  warning: z.string().optional(),
});

const memory = new Map<string, GroundedDrugInfoResponse>();

export function groundedCacheKey(agentName: string, question: string, drugs: string[]): string {
  const drugKey = [...drugs].map((d) => d.toLowerCase().trim()).sort().join(",");
  return createHash("sha256")
    .update(`${CACHE_VERSION}|${agentName}|${question.trim()}|${drugKey}`)
    .digest("hex");
}

export function getCachedGrounded(key: string): GroundedDrugInfoResponse | undefined {
  const hit = memory.get(key);
  if (hit) return hit;

  const file = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(file)) return undefined;
  try {
    const parsed = CachedSchema.safeParse(JSON.parse(readFileSync(file, "utf-8")));
    if (!parsed.success) return undefined;
    memory.set(key, parsed.data);
    return parsed.data;
  } catch {
    return undefined;
  }
}

export function setCachedGrounded(key: string, value: GroundedDrugInfoResponse): void {
  memory.set(key, value);
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(value));
  } catch {
    // Disk persistence is best-effort.
  }
}
