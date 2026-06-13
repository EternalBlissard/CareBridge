import { useEffect, useState } from "react";
import type { DrugLabelLookupResult, DrugLabelsResponse } from "@shared/api";

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
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<DrugLabelsResponse>;
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "FDA lookup failed");
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
    return <p className="fda-attribution error">{error}</p>;
  }
  if (!attribution) return null;
  return (
    <p className="fda-attribution muted">
      {attribution}
      {warning && <span className="warning"> — {warning}</span>}
    </p>
  );
}
