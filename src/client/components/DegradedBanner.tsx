import type { CSSProperties } from "react";

type DegradedBannerProps = { message: string; inline?: boolean };

/** Shown when the API succeeded with a fallback (skeleton, cache, rate limit, etc.). */
export default function DegradedBanner({ message, inline = false }: DegradedBannerProps) {
  const box: CSSProperties = inline
    ? {
        margin: 0,
        padding: "0.5rem 0.75rem",
        background: "var(--cb-degraded-bg)",
        borderLeft: "3px solid var(--cb-degraded-border)",
        borderRadius: "0 6px 6px 0",
        color: "var(--cb-degraded-fg)",
      }
    : {
        display: "flex",
        alignItems: "flex-start",
        gap: "0.65rem",
        padding: "0.85rem 1rem",
        background: "var(--cb-degraded-bg)",
        border: "2px solid var(--cb-degraded-border)",
        borderRadius: "var(--r-lg)",
        color: "var(--cb-degraded-fg)",
      };
  return (
    <div role="status" aria-live="polite" style={box}>
      {!inline && (
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "1.4rem",
            height: "1.4rem",
            borderRadius: "50%",
            background: "var(--cb-degraded-icon)",
            color: "#fff",
            fontWeight: 800,
            fontSize: "0.85rem",
          }}
        >
          !
        </span>
      )}
      <p style={{ margin: 0, lineHeight: 1.45 }}>{message}</p>
    </div>
  );
}
