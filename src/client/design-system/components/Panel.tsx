import React from "react";

export interface PanelProps {
  title?: React.ReactNode;
  /** Number rendered after the title, e.g. "Timeline (7)". */
  count?: number;
  /** Small muted caption under the title. */
  note?: React.ReactNode;
  /** Border/background tone for danger (red-flag) or warning (interaction) panels. */
  tone?: "default" | "danger" | "warning";
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Core white content card used throughout the clinician view (summary,
 * timeline, meds…). Optional heading, count, and a small note line.
 */
export function Panel({ title, count, note, children, tone = "default", className, style }: PanelProps) {
  const tones: Record<string, React.CSSProperties> = {
    default: { borderColor: "var(--cb-line)", background: "var(--cb-surface)" },
    danger: { borderColor: "#fca5a5", background: "#fef2f2" },
    warning: { borderColor: "#fdba74", background: "#fffbeb" },
  };
  return (
    <section
      className={className}
      style={{
        border: "1px solid",
        borderRadius: "var(--r-lg)",
        padding: "1rem 1.25rem",
        boxShadow: "var(--shadow-sm)",
        fontFamily: "var(--font-sans)",
        color: "var(--cb-ink)",
        ...tones[tone],
        ...style,
      }}
    >
      {title && (
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700 }}>
          {title}
          {count != null && (
            <span style={{ color: "var(--cb-ink-muted)", fontWeight: 600 }}> ({count})</span>
          )}
        </h3>
      )}
      {note && (
        <p
          style={{ margin: "-0.25rem 0 0.75rem", fontSize: "var(--fs-sm)", color: "var(--cb-ink-muted)" }}
        >
          {note}
        </p>
      )}
      {children}
    </section>
  );
}
