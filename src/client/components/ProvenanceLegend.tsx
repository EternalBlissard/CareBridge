import { ProvenanceTag } from "./ProvenanceTag";

/**
 * Explains the two provenance tags the moment results appear — the core
 * trust signal (AI language output vs deterministic safety output).
 */
export default function ProvenanceLegend() {
  return (
    <div
      role="note"
      aria-label="What the labels mean"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "var(--sp-3)",
        margin: "var(--sp-3) 0",
        fontSize: "var(--fs-sm)",
        color: "var(--cb-ink-soft)",
      }}
    >
      <span style={{ fontWeight: 600, color: "var(--cb-ink)" }}>What the labels mean:</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--sp-2)" }}>
        <ProvenanceTag provenance="ai-generated" compact />
        the model wrote it — verify
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--sp-2)" }}>
        <ProvenanceTag provenance="deterministic-rule" ruleId="rule-id" compact />
        from rules + DDInter / openFDA — never the model
      </span>
    </div>
  );
}
