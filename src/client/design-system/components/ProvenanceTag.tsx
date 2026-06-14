import React from "react";
import type { Provenance } from "@shared/types";

const STYLES: Record<Provenance, { label: string; bg: string; border: string; fg: string }> = {
  "ai-generated": {
    label: "AI-generated",
    bg: "var(--cb-ai-bg)",
    border: "var(--cb-ai-border)",
    fg: "var(--cb-ai-fg)",
  },
  "deterministic-rule": {
    label: "Deterministic rule",
    bg: "var(--cb-rule-bg)",
    border: "var(--cb-rule-border)",
    fg: "var(--cb-rule-fg)",
  },
};

export interface ProvenanceTagProps {
  /** Where the value came from. */
  provenance: Provenance;
  /** Rule identifier, shown in mono after the label (deterministic only). */
  ruleId?: string;
  /** Smaller inline variant. */
  compact?: boolean;
  style?: React.CSSProperties;
}

/**
 * Provenance tag — CareBridge's signature trust signal. Marks every value as
 * model-produced (indigo) or rule-produced (green); optionally shows the
 * deterministic ruleId in mono.
 */
export function ProvenanceTag({ provenance, ruleId, compact = false, style }: ProvenanceTagProps) {
  const s = STYLES[provenance];
  return (
    <span
      title={
        provenance === "ai-generated"
          ? "Content produced by the language model — verify with a clinician"
          : `Safety output from curated rules${ruleId ? ` (${ruleId})` : ""}`
      }
      style={{
        display: "inline-block",
        fontFamily: "var(--font-sans)",
        fontSize: compact ? "0.65rem" : "var(--fs-xs)",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        padding: compact ? "0.1rem 0.35rem" : "0.15rem 0.45rem",
        borderRadius: "4px",
        border: "1px solid",
        background: s.bg,
        borderColor: s.border,
        color: s.fg,
        ...style,
      }}
    >
      {s.label}
      {ruleId && (
        <span
          style={{
            textTransform: "none",
            fontWeight: 600,
            letterSpacing: "normal",
            fontFamily: "var(--font-mono)",
          }}
        >
          {" · "}
          {ruleId}
        </span>
      )}
    </span>
  );
}
