import { DefaultAzureCredential } from "@azure/identity";
import type { GroundedCitation, GroundedDrugInfoResponse } from "../../shared/api.js";
import { lookupDrugLabels } from "../openfda/service.js";
import { getCachedGrounded, groundedCacheKey, setCachedGrounded } from "./cache.js";

/**
 * Microsoft Foundry IQ integration — agentic knowledge retrieval.
 *
 * A Foundry IQ knowledge base (built over the openFDA drug-label docs exported
 * by `npm run foundry:export`) is connected to a Foundry Agent. We call that
 * agent via the Responses API; Foundry IQ plans the query, retrieves from the
 * knowledge base, and returns a grounded answer with citations.
 *
 * Safety boundary: this produces *explanatory language only*. Interaction
 * severity and red-flag urgency remain deterministic (DDInter + the rule
 * engine) and are never decided here. When Foundry IQ is disabled or
 * unavailable, we degrade to the deterministic cached FDA label excerpt so the
 * feature never hard-fails.
 */

const TOKEN_SCOPE = "https://ai.azure.com/.default";
const ATTRIBUTION =
  "Grounded by Microsoft Foundry IQ over openFDA drug labels (public-domain FDA data).";

let credential: DefaultAzureCredential | null = null;
function getCredential(): DefaultAzureCredential {
  credential ??= new DefaultAzureCredential();
  return credential;
}

export function foundryEnabled(): boolean {
  return process.env.FOUNDRY_IQ?.trim().toLowerCase() === "on";
}

/** Deterministic degrade path: surface the cached openFDA label excerpt. */
async function fallback(drugs: string[], warning: string): Promise<GroundedDrugInfoResponse> {
  const { labels } = await lookupDrugLabels(drugs, drugs);
  const found = labels.filter((l) => l.found && l.excerpt);
  return {
    answer:
      found.length > 0
        ? found.map((l) => `${l.drugName}: ${l.excerpt}`).join("\n\n")
        : "AI grounding unavailable, and no FDA label excerpt is cached for these medications.",
    citations: found.map((l) => ({ title: `openFDA label — ${l.drugName}` })),
    source: found.length > 0 ? "fallback-fda" : "unavailable",
    attribution: ATTRIBUTION,
    warning,
  };
}

// Minimal shape of the Foundry/OpenAI Responses payload we read. Kept loose on
// purpose — annotation shapes vary by tool, so extraction stays defensive.
interface ResponsesAnnotation {
  type?: string;
  filename?: string;
  title?: string;
  url?: string;
  text?: string;
}
interface ResponsesContent {
  type?: string;
  text?: string;
  annotations?: ResponsesAnnotation[];
}
interface ResponsesItem {
  type?: string;
  content?: ResponsesContent[];
}
interface ResponsesPayload {
  output_text?: string;
  output?: ResponsesItem[];
}

/**
 * Strip inline citation tokens (e.g. 【4:0†warfarin.md】) and markdown bold markers.
 * Sources are returned structurally via citations[] and rendered as chips, so the
 * inline tokens are noise; the UI renders plain text, so `**` would show literally.
 */
function cleanInlineCitations(text: string): string {
  return text
    .replace(/【[^】]*】/g, "")
    .replace(/\*\*/g, "")
    .replace(/ +([.,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractAnswer(payload: ResponsesPayload): string {
  let raw = payload.output_text?.trim() ?? "";
  if (!raw) {
    const parts: string[] = [];
    for (const item of payload.output ?? []) {
      for (const content of item.content ?? []) {
        if (content.text) parts.push(content.text);
      }
    }
    raw = parts.join("\n").trim();
  }
  return cleanInlineCitations(raw);
}

function extractCitations(payload: ResponsesPayload): GroundedCitation[] {
  const citations: GroundedCitation[] = [];
  const seen = new Set<string>();
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      for (const ann of content.annotations ?? []) {
        const title = ann.filename ?? ann.title ?? ann.url;
        if (title && !seen.has(title)) {
          seen.add(title);
          citations.push(ann.text ? { title, snippet: ann.text } : { title });
        }
      }
    }
  }
  return citations;
}

export async function groundedDrugInfo(
  question: string,
  drugs: string[],
): Promise<GroundedDrugInfoResponse> {
  if (!foundryEnabled()) {
    return fallback(drugs, "Foundry IQ disabled (set FOUNDRY_IQ=on). Showing FDA label excerpt.");
  }

  const endpoint = process.env.AZURE_AI_PROJECT_ENDPOINT?.trim();
  const agentName = process.env.FOUNDRY_AGENT_NAME?.trim();
  if (!endpoint || !agentName) {
    return fallback(drugs, "Foundry IQ not configured. Showing FDA label excerpt.");
  }

  // Cache successful grounded answers by (agent + question + drugs) — a warmed
  // demo click returns instantly, and repeat asks skip the ~15s retrieval call.
  const cacheKey = groundedCacheKey(agentName, question, drugs);
  const cached = getCachedGrounded(cacheKey);
  if (cached) return cached;

  try {
    const token = await getCredential().getToken(TOKEN_SCOPE);
    const res = await fetch(`${endpoint.replace(/\/$/, "")}/openai/v1/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_reference: { type: "agent_reference", name: agentName },
        input: question,
      }),
    });

    if (!res.ok) {
      return fallback(
        drugs,
        `Foundry IQ call failed (HTTP ${res.status}). Showing FDA label excerpt.`,
      );
    }

    const payload = (await res.json()) as ResponsesPayload;
    const answer = extractAnswer(payload);
    if (!answer) {
      return fallback(drugs, "Foundry IQ returned no answer. Showing FDA label excerpt.");
    }

    const result: GroundedDrugInfoResponse = {
      answer,
      citations: extractCitations(payload),
      source: "foundry-iq",
      attribution: ATTRIBUTION,
    };
    setCachedGrounded(cacheKey, result);
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return fallback(drugs, `Foundry IQ unavailable (${msg}). Showing FDA label excerpt.`);
  }
}
