import { useEffect, useState } from "react";
import type { PatientViewResponse } from "@shared/api";
import type { PatientCard, PatientStory } from "@shared/types";

type PatientViewProps = {
  story: PatientStory;
};

const KIND_LABEL: Record<PatientCard["kind"], string> = {
  overview: "Overview",
  symptom: "Symptom",
  medication: "Medication",
  safety: "Safety alert",
  interaction: "Medication safety",
  visit: "Visit",
};

const SEVERITY_ICON: Record<string, string> = {
  immediate: "🚨",
  urgent: "⚠️",
  major: "⚠️",
  moderate: "⚡",
  minor: "ℹ️",
};

export default function PatientView({ story }: PatientViewProps) {
  const [data, setData] = useState<PatientViewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/patient-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<PatientViewResponse>;
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

  if (loading) {
    return (
      <section className="patient-view" aria-live="polite">
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

  return (
    <section className="patient-view" aria-labelledby="patient-heading">
      <header className="patient-header">
        <h2 id="patient-heading">Your health summary</h2>
        <p className="patient-subtitle">
          Written in plain language — not a diagnosis or treatment plan
        </p>
        <p className="meta patient-meta">
          Rewrite source: <strong>{data.source}</strong>
          {data.warning && <span className="warning"> — {data.warning}</span>}
        </p>
      </header>

      <div className="patient-cards" aria-label="Health summary cards">
        {data.cards.map((card) => {
          const isAlert = card.kind === "safety" || card.kind === "interaction";
          const icon = card.severityLabel ? SEVERITY_ICON[card.severityLabel] : null;

          return (
            <article
              key={card.id}
              className={`patient-card patient-card-${card.kind}`}
              role={isAlert ? "alert" : undefined}
            >
              <div className="patient-card-header">
                <span className="patient-card-kind">{KIND_LABEL[card.kind]}</span>
                {card.severityLabel && (
                  <span className={`patient-severity severity-${card.severityLabel}`}>
                    {icon && <span aria-hidden="true">{icon} </span>}
                    {card.severityLabel}
                  </span>
                )}
              </div>
              <h3 className="patient-card-title">{card.title}</h3>
              <p className="patient-card-body">{card.body}</p>
              <footer className="patient-card-footer">
                <span className="provenance-tag">
                  {card.provenance === "ai-generated" ? "AI-generated" : "Rule-based"}
                </span>
                {card.ruleId && <span className="flag-meta">rule {card.ruleId}</span>}
              </footer>
            </article>
          );
        })}
      </div>

      {data.schedule.length > 0 && (
        <section className="patient-schedule" aria-labelledby="schedule-heading">
          <h3 id="schedule-heading">Your schedule</h3>
          <p className="panel-note">Built from medication timing in your story (deterministic)</p>
          <div className="schedule-grid">
            {data.schedule.map((slot) => (
              <div key={slot.id} className="schedule-slot">
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
