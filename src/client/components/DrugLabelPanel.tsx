import { useEffect, useState } from "react";
import type { DrugLabelLookupResult, DrugLabelsResponse } from "@shared/api";
import { friendlyFetchError } from "../utils/errors";

export function useDrugLabels(drugNames: string[]): {
  byDrug: Map<string, DrugLabelLookupResult>;
  attribution: string | null;
  warning: string | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<DrugLabelsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = drugNames.map((d) => d.toLowerCase().trim()).sort().join("|");

  useEffect(() => {
    if (drugNames.length === 0) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/drug-label", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drugs: drugNames, coDrugs: drugNames }),
    })
      .then(async (res) => {
        const result = (await res.json()) as DrugLabelsResponse & {
          error?: string;
          warning?: string;
        };
        if (!res.ok) {
          throw new Error(friendlyFetchError(res.status, result));
        }
        return result;
      })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          if (result.warning) setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData({
            labels: [],
            attribution: "Data provided by the U.S. Food and Drug Administration.",
            warning:
              err instanceof Error
                ? err.message
                : "FDA label lookup unavailable — DDInter severity still shown.",
          });
          setError(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  const byDrug = new Map<string, DrugLabelLookupResult>();
  for (const label of data?.labels ?? []) {
    byDrug.set(label.drugName.toLowerCase(), label);
  }

  return {
    byDrug,
    attribution: data?.attribution ?? null,
    warning: data?.warning ?? null,
    loading,
    error,
  };
}

type DrugLabelExcerptProps = {
  label: DrugLabelLookupResult | undefined;
  loading: boolean;
};

export function DrugLabelExcerpt({ label, loading }: DrugLabelExcerptProps) {
  if (loading) {
    return <p className="fda-label loading muted">Loading FDA label…</p>;
  }

  if (!label) return null;

  if (!label.found || !label.excerpt) {
    return (
      <p className="fda-label muted">
        No FDA interaction text found for this drug.
        {label.warning && <span className="warning"> {label.warning}</span>}
      </p>
    );
  }

  return (
    <blockquote className="fda-label" cite="https://open.fda.gov/">
      <p className="fda-label-heading">
        <span aria-hidden="true">📋 </span>
        FDA label — drug interactions
        <span className="fda-source"> ({label.source})</span>
      </p>
      <p className="fda-excerpt">{label.excerpt}</p>
      {label.warning && <p className="fda-warning warning">{label.warning}</p>}
    </blockquote>
  );
}

type DrugLabelAttributionProps = {
  attribution: string | null;
  warning: string | null;
  error: string | null;
};

export function DrugLabelAttribution({
  attribution,
  warning,
  error,
}: DrugLabelAttributionProps) {
  if (error) {
    return (
      <p className="fda-attribution degraded-inline" role="status">
        {error}
      </p>
    );
  }
  if (!attribution) return null;
  return (
    <p className="fda-attribution muted">
      {attribution}
      {warning && <span className="warning"> — {warning}</span>}
    </p>
  );
}
