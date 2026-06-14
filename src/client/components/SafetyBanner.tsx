import type { PatientNarrative } from "@shared/narrative";

type SafetyBannerProps = { sample?: PatientNarrative | null };

export default function SafetyBanner({ sample }: SafetyBannerProps) {
  return (
    <aside
      role="note"
      aria-label="Safety notice"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "var(--cb-caution-bg)",
        border: "2px solid var(--cb-caution-border)",
        borderRadius: "var(--r-md)",
        padding: "0.85rem 1rem",
        color: "var(--cb-caution-fg)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        marginBottom: "1.5rem",
      }}
    >
      <p style={{ margin: "0 0 0.35rem", fontWeight: 700 }}>
        <strong>Not a diagnostic tool. Not medical advice.</strong>
      </p>
      <p style={{ margin: 0, lineHeight: 1.45 }}>
        Demo uses synthetic patient data only —{" "}
        <strong>do not enter real patient information</strong>.
        {sample && <span> Loaded sample: {sample.displayName}.</span>}
      </p>
    </aside>
  );
}
