import {
  getCachedDrugLabel,
  getStaleDrugLabel,
  isCacheFresh,
  setCachedDrugLabel,
} from "./cache.js";
import {
  fetchOpenFdaLabel,
  OpenFdaRateLimitError,
  OPENFDA_ATTRIBUTION,
  parseOpenFdaResponse,
} from "./client.js";
import type { CachedDrugLabel } from "./schemas.js";

export type DrugLabelLookupResult = {
  drugName: string;
  found: boolean;
  genericNames: string[];
  brandNames: string[];
  excerpt: string | null;
  source: "openfda" | "openfda-cache" | "unavailable";
  attribution: string;
  warning?: string;
};

export type DrugLabelsBatchResult = {
  labels: DrugLabelLookupResult[];
  attribution: string;
  warning?: string;
};

const EXCERPT_MAX = 480;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function normalize(name: string): string {
  return name.toLowerCase().trim();
}

function pickExcerpt(interactionTexts: string[], coDrugs: string[]): string | null {
  if (interactionTexts.length === 0) return null;

  const others = coDrugs.map(normalize).filter(Boolean);
  for (const block of interactionTexts) {
    const lower = block.toLowerCase();
    if (others.some((d) => lower.includes(d))) {
      return truncate(block, EXCERPT_MAX);
    }
  }

  return truncate(interactionTexts[0]!, EXCERPT_MAX);
}

function toCached(
  drugName: string,
  genericNames: string[],
  brandNames: string[],
  interactionTexts: string[],
  coDrugs: string[],
): CachedDrugLabel {
  return {
    drugName: normalize(drugName),
    genericNames,
    brandNames,
    interactionTexts,
    excerpt: pickExcerpt(interactionTexts, coDrugs),
    fetchedAt: Date.now(),
  };
}

function fromCache(
  cached: CachedDrugLabel,
  coDrugs: string[],
  stale = false,
): DrugLabelLookupResult {
  const excerpt =
    pickExcerpt(cached.interactionTexts, coDrugs) ?? cached.excerpt;
  return {
    drugName: cached.drugName,
    found: cached.interactionTexts.length > 0,
    genericNames: cached.genericNames,
    brandNames: cached.brandNames,
    excerpt,
    source: "openfda-cache",
    attribution: OPENFDA_ATTRIBUTION,
    warning: stale ? "Showing cached FDA label — live lookup rate-limited." : undefined,
  };
}

async function fetchAndCache(
  drugName: string,
  coDrugs: string[],
): Promise<DrugLabelLookupResult> {
  const key = normalize(drugName);

  try {
    const raw = await fetchOpenFdaLabel(key);
    const parsed = parseOpenFdaResponse(raw);
    if (!parsed.success) {
      return {
        drugName: key,
        found: false,
        genericNames: [],
        brandNames: [],
        excerpt: null,
        source: "unavailable",
        attribution: OPENFDA_ATTRIBUTION,
        warning: "FDA label response failed validation.",
      };
    }

    const row = parsed.data.results?.[0];
    if (!row) {
      return {
        drugName: key,
        found: false,
        genericNames: [],
        brandNames: [],
        excerpt: null,
        source: "openfda",
        attribution: OPENFDA_ATTRIBUTION,
      };
    }

    const genericNames = row.openfda?.generic_name ?? [];
    const brandNames = row.openfda?.brand_name ?? [];
    const interactionTexts = row.drug_interactions ?? [];
    const cached = toCached(key, genericNames, brandNames, interactionTexts, coDrugs);
    setCachedDrugLabel(cached);

    return {
      drugName: key,
      found: interactionTexts.length > 0,
      genericNames,
      brandNames,
      excerpt: cached.excerpt,
      source: "openfda",
      attribution: OPENFDA_ATTRIBUTION,
    };
  } catch (err: unknown) {
    const stale = getStaleDrugLabel(key);
    if (stale) {
      return fromCache(stale, coDrugs, err instanceof OpenFdaRateLimitError);
    }

    return {
      drugName: key,
      found: false,
      genericNames: [],
      brandNames: [],
      excerpt: null,
      source: "unavailable",
      attribution: OPENFDA_ATTRIBUTION,
      warning:
        err instanceof OpenFdaRateLimitError
          ? "FDA label lookup rate-limited and no cache available."
          : "FDA label lookup unavailable.",
    };
  }
}

export async function lookupDrugLabels(
  drugs: string[],
  coDrugs: string[] = [],
): Promise<DrugLabelsBatchResult> {
  const unique = [...new Set(drugs.map(normalize))];
  const allCo = coDrugs.length > 0 ? coDrugs : drugs;
  const warnings: string[] = [];

  const labels: DrugLabelLookupResult[] = [];

  for (const drug of unique) {
    const others = allCo.filter((d) => normalize(d) !== drug);

    if (isCacheFresh(drug)) {
      const cached = getCachedDrugLabel(drug)!;
      labels.push(fromCache(cached, others));
      continue;
    }

    const result = await fetchAndCache(drug, others);
    labels.push(result);
    if (result.warning) warnings.push(`${drug}: ${result.warning}`);
  }

  return {
    labels,
    attribution: OPENFDA_ATTRIBUTION,
    warning: warnings.length > 0 ? warnings.join(" ") : undefined,
  };
}
