import React from "react";
import { ProvenanceTag } from "./ProvenanceTag";
import type { Provenance } from "@shared/types";

export type TimelineEventType =
  | "symptom"
  | "medication"
  | "visit"
  | "procedure"
  | "history"
  | "other";

const TYPES: Record<TimelineEventType, { bg: string; border: string; label: string }> = {
  symptom: { bg: "var(--cb-evt-symptom-bg)", border: "var(--cb-evt-symptom-border)", label: "Symptom" },
  medication: { bg: "var(--cb-evt-medication-bg)", border: "var(--cb-evt-medication-border)", label: "Medication" },
  visit: { bg: "var(--cb-evt-visit-bg)", border: "var(--cb-evt-visit-border)", label: "Visit" },
  procedure: { bg: "var(--cb-evt-procedure-bg)", border: "var(--cb-evt-procedure-border)", label: "Procedure" },
  history: { bg: "var(--cb-evt-history-bg)", border: "var(--cb-evt-history-border)", label: "History" },
  other: { bg: "var(--cb-evt-other-bg)", border: "var(--cb-evt-other-border)", label: "Other" },
};

export interface TimelineEventProps {
  type?: TimelineEventType;
  label: React.ReactNode;
  /** 1-based position shown as "#n". */
  index?: number;
  /** Free-text time reference, e.g. "2 days ago". */
  timeRef?: string;
  /** Intensity / severity hint line. */
  severityHint?: string;
  provenance?: Provenance;
  style?: React.CSSProperties;
}

/**
 * One event on the clinician timeline. Type drives a supplementary color +
 * left rail; a text chip always carries the meaning. Render inside an <ol>.
 */
export function TimelineEvent({
  type = "other",
  label,
  index,
  timeRef,
  severityHint,
  provenance = "ai-generated",
  style,
}: TimelineEventProps) {
  const t = TYPES[type] ?? TYPES.other;
  return (
    <li
      style={{
        position: "relative",
        display: "flex",
        gap: "0.75rem",
        padding: "0.85rem 1rem",
        borderRadius: "var(--r-md)",
        borderLeft: "4px solid",
        borderLeftColor: t.border,
        background: t.bg,
        listStyle: "none",
        fontFamily: "var(--font-sans)",
        color: "var(--cb-ink)",
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 10, height: 10, borderRadius: "50%", marginTop: "0.35rem", flexShrink: 0, background: t.border }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              padding: "0.15rem 0.45rem",
              borderRadius: "4px",
              background: t.border,
              color: "var(--cb-ink)",
            }}
          >
            {t.label}
          </span>
          {index != null && (
            <span style={{ fontSize: "0.75rem", color: "var(--cb-ink-muted)", fontWeight: 600 }}>
              #{index}
            </span>
          )}
          {timeRef && (
            <span style={{ fontSize: "var(--fs-sm)", color: "var(--cb-ink-muted)" }}>{timeRef}</span>
          )}
        </div>
        <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
        <div style={{ marginTop: "0.35rem" }}>
          <ProvenanceTag provenance={provenance} compact />
        </div>
        {severityHint && (
          <p style={{ margin: "0.25rem 0 0", fontSize: "var(--fs-sm)", color: "var(--cb-ink-muted)" }}>
            Intensity: {severityHint}
          </p>
        )}
      </div>
    </li>
  );
}
