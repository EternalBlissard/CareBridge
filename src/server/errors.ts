/** Map internal errors to short, user-safe messages — never expose stack traces. */

const RATE_LIMIT_RE = /429|rate.?limit|too many requests/i;
const STACK_RE = /\bat\s+[\w./]+:\d+:\d+\b|\.ts:\d+|\.js:\d+/;

export function sanitizeUserMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;

  const msg = err.message.trim();
  if (!msg || STACK_RE.test(msg)) return fallback;
  if (RATE_LIMIT_RE.test(msg)) {
    return "Service rate-limited — showing cached or rule-based data.";
  }
  if (msg.length > 140) return fallback;

  return msg;
}

export const PARSE_DEGRADED_MSG =
  "AI explanation unavailable — showing structured data from rules only.";

export const PATIENT_DEGRADED_MSG =
  "AI plain-language rewrite unavailable — showing template wording.";

export const FDA_UNAVAILABLE_MSG = "FDA label lookup unavailable — DDInter severity still shown.";
