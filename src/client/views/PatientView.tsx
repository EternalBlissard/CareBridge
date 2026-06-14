import { useEffect, useState } from "react";
import DegradedBanner from "../components/DegradedBanner";
import { GroundedDrugInfo } from "../components/GroundedDrugInfo";
import { PatientCard } from "../design-system/components/PatientCard";
import { type SeverityLevel } from "../design-system/components/SeverityChip";
import { useSpeechNarration } from "../hooks/useSpeechNarration";
import { friendlyFetchError } from "../utils/errors";
import type { PatientViewResponse } from "@shared/api";
import type { PatientStory } from "@shared/types";

type PatientViewProps = {
  story: PatientStory;
};

const SEVERITY_LEVELS = new Set<SeverityLevel>([
  "immediate",
  "urgent",
  "soon",
  "major",
  "moderate",
  "minor",
]);

/** Narrow the free-text severity label onto the design-system severity ramp. */
function severityLevel(value?: string): SeverityLevel | undefined {
  return value && SEVERITY_LEVELS.has(value as SeverityLevel)
    ? (value as SeverityLevel)
    : undefined;
}

export default function PatientView({ story }: PatientViewProps) {
  const [data, setData] = useState<PatientViewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const narration = useSpeechNarration();
  const { supported, state, activeId, speakCard, speakAll, pause, resume, stop, isSpeaking, isPaused, isActive } =
    narration;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/patient-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story }),
    })
      .then(async (res) => {
        const view = (await res.json()) as PatientViewResponse & {
          error?: string;
          warning?: string;
        };
        if (!res.ok) {
          throw new Error(friendlyFetchError(res.status, view));
        }
        return view;
      })
      .then((view) => {
        if (!cancelled) setData(view);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load patient view");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [story]);

  useEffect(() => () => stop(), [stop]);

  if (loading) {
    return (
      <section className="patient-view" aria-live="polite" aria-busy="true">
        <p className="patient-loading">Preparing your plain-language summary…</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="patient-view" role="alert">
        <p className="error">{error ?? "Patient view unavailable"}</p>
      </section>
    );
  }

  const narrationStatus =
    state === "speaking"
      ? "Narration in progress"
      : state === "paused"
        ? "Narration paused"
        : "";

  return (
    <section className="patient-view" aria-labelledby="patient-heading">
      <header className="patient-header">
        <h2 id="patient-heading">Your health summary</h2>
        <p className="patient-subtitle">
          Written in plain language — not a diagnosis or treatment plan
        </p>
        <p className="meta patient-meta">
          Rewrite source: <strong>{data.source}</strong>
        </p>

        {data.warning && <DegradedBanner message={data.warning} />}

        {supported && (
          <div className="tts-toolbar" role="group" aria-label="Text-to-speech controls">
            <button
              type="button"
              className="tts-btn tts-btn-primary"
              onClick={() => speakAll(data.cards, data.schedule)}
              disabled={isActive && activeId === "__all__"}
              aria-describedby="tts-hint"
            >
              Narrate everything
            </button>
            {isSpeaking && (
              <button type="button" className="tts-btn" onClick={pause}>
                Pause
              </button>
            )}
            {isPaused && (
              <button type="button" className="tts-btn" onClick={resume}>
                Resume
              </button>
            )}
            {isActive && (
              <button type="button" className="tts-btn" onClick={stop}>
                Stop
              </button>
            )}
            <p id="tts-hint" className="tts-hint">
              Uses your device voice — works offline. Long text is split for browser limits.
            </p>
          </div>
        )}

        {!supported && (
          <p className="tts-unsupported" role="status">
            Text-to-speech is not available in this browser.
          </p>
        )}

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {narrationStatus}
        </div>
      </header>

      <ul
        className="patient-cards"
        aria-label="Health summary cards"
        style={{ listStyle: "none", margin: "var(--sp-4) 0 0", padding: 0, display: "grid", gap: "var(--sp-4)" }}
      >
        {data.cards.map((card) => {
          const isReading = activeId === card.id && isActive;

          return (
            <li key={card.id}>
              <PatientCard
                kind={card.kind}
                title={card.title}
                body={card.body}
                severityLabel={severityLevel(card.severityLabel)}
                provenance={card.provenance}
                ruleId={card.ruleId}
                reading={isReading}
                aria-busy={isReading}
                action={
                  supported ? (
                    <button
                      type="button"
                      className="tts-read-btn"
                      onClick={() => speakCard(card)}
                      aria-pressed={isReading}
                      aria-label={`Read this card: ${card.title}`}
                    >
                      {isReading ? "Reading…" : "Read this"}
                    </button>
                  ) : undefined
                }
              />
            </li>
          );
        })}
      </ul>

      <GroundedDrugInfo medications={story.medications} />

      {data.schedule.length > 0 && (
        <section className="patient-schedule" aria-labelledby="schedule-heading">
          <h3 id="schedule-heading">Your schedule</h3>
          <p className="panel-note">Built from medication timing in your story (deterministic)</p>
          <div className="schedule-grid" role="list" aria-label="Daily medication schedule">
            {data.schedule.map((slot) => (
              <div key={slot.id} className="schedule-slot" role="listitem">
                <h4 className="schedule-time">{slot.timeLabel}</h4>
                <ul className="schedule-items">
                  {slot.items.map((item, i) => (
                    <li key={`${slot.id}-${i}`}>
                      <strong>{item.label}</strong>
                      {item.detail && <span className="muted"> — {item.detail}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
