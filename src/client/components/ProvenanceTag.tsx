import type { Provenance } from "@shared/types";

type ProvenanceTagProps = {
  provenance: Provenance;
  ruleId?: string;
  compact?: boolean;
};

export function ProvenanceTag({ provenance, ruleId, compact }: ProvenanceTagProps) {
  const isAi = provenance === "ai-generated";
  const label = isAi ? "AI-generated" : "Deterministic rule";

  return (
    <span
      className={`provenance-tag provenance-${provenance}${compact ? " provenance-compact" : ""}`}
      title={
        isAi
          ? "Content produced by the language model — verify with a clinician"
          : `Safety output from curated rules${ruleId ? ` (${ruleId})` : ""}`
      }
    >
      {label}
      {ruleId && <span className="provenance-rule"> · {ruleId}</span>}
    </span>
  );
}
