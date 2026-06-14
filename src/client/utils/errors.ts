/** User-safe error strings for the client — never show stack traces or raw HTTP bodies. */

export function friendlyFetchError(
  status: number,
  body?: { error?: string; warning?: string },
): string {
  if (body?.warning) return body.warning;
  if (body?.error && !looksTechnical(body.error)) return body.error;

  if (status === 429) {
    return "Service is busy (rate limited). Try again shortly or use cached demo data.";
  }
  if (status >= 500) {
    return "Something went wrong on our side. Structured safety rules may still apply if you retry.";
  }
  if (status === 400) {
    return "Could not process that input. Check the narrative and try again.";
  }
  return "Request failed. Please try again.";
}

function looksTechnical(message: string): boolean {
  return (
    message.includes(" at ") ||
    message.includes(".ts:") ||
    message.includes(".js:") ||
    message.length > 160
  );
}

export const PARSE_FALLBACK_HINT =
  "If parsing fails, reload the Synthea sample and try again — the app falls back to rule-based structure.";
