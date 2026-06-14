import { Panel } from "../design-system/components/Panel";

const STEPS = [
  {
    n: 1,
    title: "Pick or paste a patient story",
    detail: "A synthetic sample is pre-loaded — or paste your own (synthetic) text.",
  },
  {
    n: 2,
    title: "Parse it",
    detail:
      "One AI call structures the text; deterministic rules flag red flags and drug interactions.",
  },
  {
    n: 3,
    title: "Switch views",
    detail:
      "Read a clinician timeline or an accessible, narratable patient briefing — same data, two audiences.",
  },
];

/** First-run orientation shown on the app screen. */
export default function HowItWorks() {
  return (
    <Panel title="How it works" style={{ marginBottom: "var(--sp-4)" }}>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "var(--sp-3)" }}>
        {STEPS.map((s) => (
          <li key={s.n} style={{ display: "flex", gap: "var(--sp-3)", alignItems: "flex-start" }}>
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "1.6rem",
                height: "1.6rem",
                borderRadius: "var(--r-pill)",
                background: "var(--cb-brand)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              {s.n}
            </span>
            <span>
              <strong>{s.title}.</strong>{" "}
              <span style={{ color: "var(--cb-ink-soft)" }}>{s.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
