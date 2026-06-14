import React from "react";

export type SeverityLevel =
  | "immediate"
  | "urgent"
  | "soon"
  | "major"
  | "moderate"
  | "minor";

// Maps both red-flag urgency and interaction severity onto one warm ramp.
const LEVELS: Record<SeverityLevel, { tier: 1 | 2 | 3; label: string }> = {
  immediate: { tier: 1, label: "Immediate" },
  major: { tier: 1, label: "Major" },
  urgent: { tier: 2, label: "Urgent" },
  moderate: { tier: 2, label: "Moderate" },
  soon: { tier: 3, label: "Soon" },
  minor: { tier: 3, label: "Minor" },
};

const TIER: Record<1 | 2 | 3, { bg: string; border: string; fg: string }> = {
  1: { bg: "var(--cb-sev-1-bg)", border: "var(--cb-sev-1-border)", fg: "var(--cb-sev-1-fg)" },
  2: { bg: "var(--cb-sev-2-bg)", border: "var(--cb-sev-2-border)", fg: "var(--cb-sev-2-fg)" },
  3: { bg: "var(--cb-sev-3-bg)", border: "var(--cb-sev-3-border)", fg: "var(--cb-sev-3-fg)" },
};

export interface SeverityChipProps {
  level: SeverityLevel;
  /** Optional description after the level label. */
  children?: React.ReactNode;
  /** Fully rounded pill form (used in the red-flag chip row). */
  pill?: boolean;
  style?: React.CSSProperties;
}

/**
 * Severity / urgency chip. Always pairs a "!" glyph with a text label so
 * meaning never depends on color alone.
 */
export function SeverityChip({ level, children, pill = false, style }: SeverityChipProps) {
  const meta = LEVELS[level] ?? LEVELS.minor;
  const t = TIER[meta.tier];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        fontFamily: "var(--font-sans)",
        fontSize: "0.8rem",
        fontWeight: 600,
        padding: pill ? "0.45rem 0.7rem" : "0.25rem 0.55rem",
        borderRadius: pill ? "var(--r-pill)" : "var(--r-sm)",
        border: "1px solid",
        background: t.bg,
        borderColor: t.border,
        color: t.fg,
        ...style,
      }}
    >
      <span aria-hidden="true" style={{ fontWeight: 800 }}>
        !
      </span>
      <span
        style={{
          textTransform: "uppercase",
          fontSize: "0.7rem",
          letterSpacing: "0.03em",
          fontWeight: 700,
        }}
      >
        {meta.label}
      </span>
      {children && <span style={{ fontWeight: 500 }}>{children}</span>}
    </span>
  );
}
