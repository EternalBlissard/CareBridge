import React from "react";
import { ProvenanceTag } from "./ProvenanceTag";
import { SeverityChip, type SeverityLevel } from "./SeverityChip";
import type { Provenance } from "@shared/types";

export type PatientCardKind =
  | "overview"
  | "symptom"
  | "medication"
  | "safety"
  | "interaction"
  | "visit";

const KIND: Record<PatientCardKind, { label: string; border: string; bg: string }> = {
  overview: { label: "Overview", border: "#6ee7b7", bg: "#f0fdf9" },
  symptom: { label: "Symptom", border: "var(--cb-line)", bg: "var(--cb-surface)" },
  medication: { label: "Medication", border: "#93c5fd", bg: "#f8fbff" },
  safety: { label: "Safety alert", border: "#fca5a5", bg: "#fff5f5" },
  interaction: { label: "Medication safety", border: "#fca5a5", bg: "#fff5f5" },
  visit: { label: "Visit", border: "var(--cb-line)", bg: "var(--cb-surface)" },
};

export interface PatientCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  kind?: PatientCardKind;
  title: React.ReactNode;
  body: React.ReactNode;
  /** Optional severity chip in the header. */
  severityLabel?: SeverityLevel;
  provenance?: Provenance;
  ruleId?: string;
  /** Footer action node, e.g. a "Read this" TTS button. */
  action?: React.ReactNode;
  /** Outlines the card while being read aloud. */
  reading?: boolean;
  style?: React.CSSProperties;
}

/**
 * Plain-language patient card — large type, ≥7:1 contrast, generous radius.
 * The building block of the accessible patient view.
 */
export function PatientCard({
  kind = "overview",
  title,
  body,
  severityLabel,
  provenance = "ai-generated",
  ruleId,
  action,
  reading = false,
  style,
  ...rest
}: PatientCardProps) {
  const k = KIND[kind] ?? KIND.overview;
  return (
    <article
      style={{
        background: k.bg,
        border: "2px solid",
        borderColor: k.border,
        borderRadius: "var(--r-xl)",
        padding: "1.25rem 1.5rem",
        fontFamily: "var(--font-sans)",
        color: "var(--cb-ink)",
        outline: reading ? "3px solid var(--cb-focus-ring)" : "none",
        outlineOffset: "2px",
        ...style,
      }}
      {...rest}
    >
      <div
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}
      >
        <span
          style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--cb-ink-soft)",
          }}
        >
          {k.label}
        </span>
        {severityLabel && <SeverityChip level={severityLabel} />}
      </div>
      <h3 style={{ margin: "0 0 0.65rem", fontSize: "1.35rem", lineHeight: 1.35, fontWeight: 700 }}>
        {title}
      </h3>
      <p style={{ margin: 0, fontSize: "1rem", lineHeight: "var(--lh-relaxed)" }}>{body}</p>
      <footer
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.75rem",
          marginTop: "0.85rem",
          paddingTop: "0.65rem",
          borderTop: "1px solid var(--cb-line)",
          fontSize: "var(--fs-sm)",
        }}
      >
        <ProvenanceTag provenance={provenance} ruleId={ruleId} />
        {action && <span style={{ marginLeft: "auto" }}>{action}</span>}
      </footer>
    </article>
  );
}
