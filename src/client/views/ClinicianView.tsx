import {
  interactionsForMed,
  otherDrugInInteraction,
} from "@shared/interaction-utils";
import { buildClinicianBrief, timelineTypeStyle } from "../../rules/clinician-brief.js";
import type { ParseSource } from "@shared/api";
import type { PatientStory } from "@shared/types";

type ClinicianViewProps = {
  story: PatientStory;
  source: ParseSource;
  warning?: string;
};

const URGENCY_CHIP_CLASS: Record<string, string> = {
  immediate: "rf-chip-immediate",
  urgent: "rf-chip-urgent",
  soon: "rf-chip-soon",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

export default function ClinicianView({ story, source, warning }: ClinicianViewProps) {
  const brief = buildClinicianBrief(story);

  return (
    <section className="clinician-view" aria-labelledby="clinician-heading">
      <header className="clinician-header">
        <h2 id="clinician-heading">Clinician view</h2>
        <p className="clinician-subtitle">
          Structured triage — questions only, never diagnosis
        </p>
        <p className="meta">
          Parse source: <strong>{source}</strong>
          {warning && <span className="warning"> — {warning}</span>}
        </p>
      </header>

      {story.redFlags.length > 0 && (
        <div className="rf-chip-row" role="alert" aria-label="Red flag alerts">
          {story.redFlags.map((flag) => (
            <span
              key={flag.id}
              className={`rf-chip ${URGENCY_CHIP_CLASS[flag.urgency] ?? ""}`}
              title={`${flag.message} (rule ${flag.ruleId})`}
            >
              <span className="rf-chip-icon" aria-hidden="true">
                ⚠
              </span>
              <span className="rf-chip-urgency">{flag.urgency}</span>
              <span className="rf-chip-text">{flag.message}</span>
            </span>
          ))}
        </div>
      )}

      <article className="panel clinician-summary">
        <h3>Clinical summary</h3>
        <p className="panel-note">Deterministic synthesis — not AI-generated</p>
        <p className="summary-text">{brief.summary}</p>
      </article>

      <div className="panel clinician-timeline">
        <h3>Timeline ({story.timeline.length})</h3>
        <p className="panel-note">Color-coded by event type</p>
        <ol className="timeline-track" aria-label="Patient timeline">
          {story.timeline.map((evt, index) => {
            const style = timelineTypeStyle(evt.type);
            return (
              <li
                key={evt.id}
                className="timeline-item"
                style={{
                  backgroundColor: style.bg,
                  borderLeftColor: style.border,
                }}
              >
                <div className="timeline-marker" style={{ backgroundColor: style.border }} />
                <div className="timeline-body">
                  <div className="timeline-meta">
                    <span
                      className="timeline-type-chip"
                      style={{ backgroundColor: style.border, color: "#1f2937" }}
                    >
                      {style.label}
                    </span>
                    <span className="timeline-index">#{index + 1}</span>
                    {evt.timeRef && <span className="muted">{evt.timeRef}</span>}
                  </div>
                  <p className="timeline-label">{evt.label}</p>
                  {evt.severityHint && (
                    <p className="timeline-hint muted">Intensity: {evt.severityHint}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {brief.followUpQuestions.length > 0 && (
        <div className="panel follow-up-panel">
          <h3>Suggested follow-up questions ({brief.followUpQuestions.length})</h3>
          <p className="panel-note">
            Rule-based prompts for history-taking — not diagnoses or treatment orders
          </p>
          <ol className="follow-up-list">
            {brief.followUpQuestions.map((q) => (
              <li key={q.id} className={`follow-up-item priority-${q.priority}`}>
                <span className={`priority-badge priority-${q.priority}`}>
                  {PRIORITY_LABEL[q.priority]}
                </span>
                <p className="follow-up-question">{q.question}</p>
                <p className="follow-up-rationale muted">{q.rationale}</p>
                <span className="flag-meta">rule {q.ruleId}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="panel clinician-meds">
        <h3>Medications ({story.medications.length})</h3>
        <p className="panel-note">Interaction severity from DDInter (deterministic lookup)</p>
        <ul className="med-list">
          {story.medications.map((med) => {
            const hits = interactionsForMed(med, story.interactions);
            return (
              <li key={med.normalizedName} className="med-card">
                <div className="med-header">
                  <strong>{med.name}</strong>
                  {med.dose && <span className="muted"> — {med.dose}</span>}
                  {med.frequency && <span className="muted"> ({med.frequency})</span>}
                </div>
                {hits.length > 0 && (
                  <div className="interaction-chips">
                    {hits.map((ix) => (
                      <span
                        key={ix.ruleId}
                        className={`ix-chip severity-${ix.severity}`}
                        title={`${ix.mechanism}${ix.management ? ` — ${ix.management}` : ""}`}
                        role={ix.severity === "major" ? "alert" : "note"}
                      >
                        ⚠ {ix.severity}: {otherDrugInInteraction(med, ix)}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {(story.interactions.length > 0 || story.symptoms.length > 0) && (
        <details className="panel clinician-details">
          <summary>Symptoms &amp; interactions detail</summary>
          {story.symptoms.length > 0 && (
            <div className="detail-block">
              <h4>Symptoms ({story.symptoms.length})</h4>
              <ul>
                {story.symptoms.map((s) => (
                  <li key={s.normalizedTerm}>
                    {s.isRedFlag && (
                      <span className="chip chip-danger" aria-label="Red flag symptom">
                        ⚠ red flag
                      </span>
                    )}
                    {s.term}
                    {s.onset && <span className="muted"> · onset {s.onset}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {story.interactions.length > 0 && (
            <div className="detail-block">
              <h4>Drug interactions ({story.interactions.length})</h4>
              <ul className="flag-list">
                {story.interactions.map((ix) => (
                  <li key={ix.ruleId} className={`flag-item severity-row-${ix.severity}`}>
                    <span className={`ix-chip severity-${ix.severity}`}>{ix.severity}</span>
                    <span className="flag-message">
                      {ix.drugA} + {ix.drugB}
                    </span>
                    <span className="flag-meta">{ix.mechanism}</span>
                    {ix.management && (
                      <span className="flag-meta">Management: {ix.management}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </details>
      )}
    </section>
  );
}
