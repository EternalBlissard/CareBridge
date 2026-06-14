import { useState } from "react";
import type { GroundedDrugInfoResponse, GroundedSource } from "@shared/api";
import type { Medication } from "@shared/types";
import { friendlyFetchError } from "../utils/errors";

/**
 * "Ask about your medications" — a plain-language answer grounded in FDA drug
 * labels via Microsoft Foundry IQ (agentic knowledge retrieval). Explanation
 * only: interaction severity and red flags stay deterministic rules elsewhere.
 * When Foundry IQ is off/unavailable the server returns the cached FDA excerpt,
 * shown here with an honest "Foundry IQ offline" badge.
 */

const SOURCE_BADGE: Record<GroundedSource, { label: string; bg: string; border: string; fg: string }> = {
  "foundry-iq": { label: "Grounded · Foundry IQ", bg: "#fff7ed", border: "#fdba74", fg: "#9a3412" },
  "fallback-fda": { label: "FDA label · Foundry IQ offline", bg: "#f1f5f9", border: "#cbd5e1", fg: "#334155" },
  unavailable: { label: "Unavailable", bg: "#f1f5f9", border: "#cbd5e1", fg: "#334155" },
};

type Props = { medications: Medication[] };

export function GroundedDrugInfo({ medications }: Props) {
  const [data, setData] = useState<GroundedDrugInfoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drugs = [...new Set(medications.map((m) => m.normalizedName || m.name).filter(Boolean))];
  if (drugs.length === 0) return null;

  const question = `In plain language, what should I know about taking ${drugs.join(
    ", ",
  )} together? Focus on interactions and safety.`;

  async function ask() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/grounded-drug-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, drugs }),
      });
      const result = (await res.json()) as GroundedDrugInfoResponse & {
        error?: string;
        warning?: string;
      };
      if (!res.ok) throw new Error(friendlyFetchError(res.status, result));
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load grounded answer");
    } finally {
      setLoading(false);
    }
  }

  const badge = data ? SOURCE_BADGE[data.source] : null;

  return (
    <section
      className="grounded-drug-info"
      aria-labelledby="grounded-heading"
      style={{ marginTop: "var(--sp-5)" }}
    >
      <h3 id="grounded-heading">Ask about your medications</h3>
      <p className="panel-note">
        Plain-language answer grounded in FDA drug labels via Microsoft Foundry IQ. Explanation
        only — not a diagnosis. Interaction severity stays a deterministic rule.
      </p>
      <button
        type="button"
        className="tts-btn tts-btn-primary"
        onClick={ask}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "Asking…" : data ? "Ask again" : "Explain my medications"}
      </button>

      {error && (
        <p className="error" role="alert" style={{ marginTop: "var(--sp-3)" }}>
          {error}
        </p>
      )}

      {data && badge && (
        <article
          aria-live="polite"
          style={{
            marginTop: "var(--sp-4)",
            background: "#fffdf8",
            border: "2px solid",
            borderColor: badge.border,
            borderRadius: "var(--r-xl)",
            padding: "1.25rem 1.5rem",
            color: "var(--cb-ink)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.6rem",
            }}
          >
            <span
              style={{
                display: "inline-block",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                border: "1px solid",
                background: badge.bg,
                borderColor: badge.border,
                color: badge.fg,
              }}
            >
              {badge.label}
            </span>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: "1rem",
              lineHeight: "var(--lh-relaxed)",
              whiteSpace: "pre-wrap",
            }}
          >
            {data.answer}
          </p>

          {data.citations.length > 0 && (
            <div style={{ marginTop: "0.85rem" }}>
              <p
                style={{
                  margin: "0 0 0.4rem",
                  fontSize: "var(--fs-sm)",
                  fontWeight: 700,
                  color: "var(--cb-ink-soft)",
                }}
              >
                Sources
              </p>
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.4rem",
                }}
              >
                {data.citations.map((c, i) => (
                  <li
                    key={i}
                    title={c.snippet}
                    style={{
                      fontSize: "var(--fs-xs)",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "999px",
                      background: "var(--cb-surface)",
                      border: "1px solid var(--cb-line)",
                    }}
                  >
                    <span aria-hidden="true">📄 </span>
                    {c.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <footer
            style={{
              marginTop: "0.85rem",
              paddingTop: "0.65rem",
              borderTop: "1px solid var(--cb-line)",
              fontSize: "var(--fs-sm)",
              color: "var(--cb-ink-soft)",
            }}
          >
            {data.attribution}
            {data.warning && <span className="warning"> — {data.warning}</span>}
          </footer>
        </article>
      )}
    </section>
  );
}
