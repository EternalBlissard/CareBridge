import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { OpenFdaResponseSchema } from "./schemas.js";

const execFileAsync = promisify(execFile);

export const OPENFDA_BASE = "https://api.fda.gov/drug/label.json";
export const OPENFDA_ATTRIBUTION =
  "Data provided by the U.S. Food and Drug Administration.";

const MAX_RETRIES = 4;
const INITIAL_BACKOFF_MS = 1000;
const CURL_TIMEOUT_SEC = 30;
const CURL_MAX_BYTES = 12 * 1024 * 1024;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildOpenFdaUrl(drugName: string): string {
  const term = drugName.toLowerCase().trim();
  // generic_name only — URLSearchParams encodes '+' as %2B which breaks OR queries.
  const params = new URLSearchParams({
    search: `openfda.generic_name:${term}`,
    limit: "1",
  });
  const apiKey = process.env.OPENFDA_API_KEY?.trim();
  if (apiKey) params.set("api_key", apiKey);
  return `${OPENFDA_BASE}?${params.toString()}`;
}

export class OpenFdaRateLimitError extends Error {
  constructor() {
    super("openFDA rate limit (HTTP 429)");
    this.name = "OpenFdaRateLimitError";
  }
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return true;
  const code =
    "code" in err && typeof err.code === "string" ? err.code : undefined;
  if (code === "ETIMEDOUT" || code === "ENETUNREACH" || code === "ECONNRESET") {
    return true;
  }
  const cause = err.cause;
  if (cause && typeof cause === "object" && "code" in cause) {
    const causeCode = (cause as { code?: string }).code;
    if (
      causeCode === "ETIMEDOUT" ||
      causeCode === "ENETUNREACH" ||
      causeCode === "ECONNRESET"
    ) {
      return true;
    }
  }
  return err.message === "fetch failed" || err.message === "Network error";
}

function assertOpenFdaBody(parsed: unknown): unknown {
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    const err = (parsed as { error?: { code?: string; message?: string } }).error;
    if (err?.code === "OVER_RATE_LIMIT") {
      throw new OpenFdaRateLimitError();
    }
    throw new Error(`openFDA error: ${err?.code ?? "unknown"}`);
  }
  return parsed;
}

async function fetchViaHttp(url: string): Promise<unknown> {
  const res = await fetch(url);

  if (res.status === 429) {
    throw new OpenFdaRateLimitError();
  }

  if (!res.ok) {
    if (res.status === 404) return { results: [] };
    throw new Error(`openFDA HTTP ${res.status}`);
  }

  return assertOpenFdaBody(await res.json());
}

/** curl -4 fallback for WSL / flaky Node fetch (IPv4, 30s timeout). */
async function fetchViaCurl(url: string): Promise<unknown> {
  const { stdout } = await execFileAsync(
    "curl",
    [
      "-4",
      "-s",
      "-S",
      "--max-time",
      String(CURL_TIMEOUT_SEC),
      "-H",
      "Accept: application/json",
      url,
    ],
    { maxBuffer: CURL_MAX_BYTES },
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error("curl returned non-JSON from openFDA");
  }

  return assertOpenFdaBody(parsed);
}

async function fetchOnce(url: string): Promise<unknown> {
  try {
    return await fetchViaHttp(url);
  } catch (err: unknown) {
    if (err instanceof OpenFdaRateLimitError) throw err;
    if (!isNetworkError(err)) throw err;

    try {
      return await fetchViaCurl(url);
    } catch (curlErr: unknown) {
      const fetchMsg = err instanceof Error ? err.message : "fetch failed";
      const curlMsg =
        curlErr instanceof Error ? curlErr.message : "curl failed";
      throw new Error(`${fetchMsg}; curl fallback: ${curlMsg}`);
    }
  }
}

export async function fetchOpenFdaLabel(drugName: string): Promise<unknown> {
  const url = buildOpenFdaUrl(drugName);
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = INITIAL_BACKOFF_MS * 2 ** (attempt - 1);
      await sleep(delay);
    }

    try {
      return await fetchOnce(url);
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error("openFDA request failed");
      if (err instanceof OpenFdaRateLimitError) continue;
    }
  }

  throw lastError ?? new Error("openFDA request failed");
}

export function parseOpenFdaResponse(raw: unknown) {
  return OpenFdaResponseSchema.safeParse(raw);
}
