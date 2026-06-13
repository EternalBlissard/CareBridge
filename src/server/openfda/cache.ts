import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CachedDrugLabel } from "./schemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "../../../.cache/openfda");

/** 24 hours per build plan */
export const OPENFDA_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheEnvelope = {
  cachedAt: number;
  data: CachedDrugLabel;
};

const memory = new Map<string, CacheEnvelope>();

function cacheKey(drugName: string): string {
  return drugName.toLowerCase().trim();
}

function cacheFile(key: string): string {
  return join(CACHE_DIR, `${key.replace(/[^a-z0-9_-]/g, "_")}.json`);
}

export function getCachedDrugLabel(drugName: string): CachedDrugLabel | undefined {
  const key = cacheKey(drugName);
  const mem = memory.get(key);
  if (mem && Date.now() - mem.cachedAt < OPENFDA_CACHE_TTL_MS) {
    return mem.data;
  }

  const file = cacheFile(key);
  if (!existsSync(file)) return undefined;
  try {
    const envelope = JSON.parse(readFileSync(file, "utf-8")) as CacheEnvelope;
    if (Date.now() - envelope.cachedAt >= OPENFDA_CACHE_TTL_MS) return undefined;
    memory.set(key, envelope);
    return envelope.data;
  } catch {
    return undefined;
  }
}

/** Returns stale cache entry regardless of TTL — for 429 fallback */
export function getStaleDrugLabel(drugName: string): CachedDrugLabel | undefined {
  const key = cacheKey(drugName);
  const mem = memory.get(key);
  if (mem) return mem.data;

  const file = cacheFile(key);
  if (!existsSync(file)) return undefined;
  try {
    const envelope = JSON.parse(readFileSync(file, "utf-8")) as CacheEnvelope;
    memory.set(key, envelope);
    return envelope.data;
  } catch {
    return undefined;
  }
}

export function setCachedDrugLabel(data: CachedDrugLabel): void {
  const key = cacheKey(data.drugName);
  const envelope: CacheEnvelope = { cachedAt: Date.now(), data };
  memory.set(key, envelope);
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cacheFile(key), JSON.stringify(envelope));
  } catch {
    // Best-effort disk persistence.
  }
}

export function isCacheFresh(drugName: string): boolean {
  const key = cacheKey(drugName);
  const mem = memory.get(key);
  if (mem && Date.now() - mem.cachedAt < OPENFDA_CACHE_TTL_MS) return true;

  const hit = getCachedDrugLabel(drugName);
  return hit !== undefined;
}
