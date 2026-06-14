import {
  interactionsForMed,
  otherDrugInInteraction,
} from "@shared/interaction-utils";
import { buildClinicianBrief } from "../../rules/clinician-brief.js";
import {
  DrugLabelAttribution,
  DrugLabelExcerpt,
  useDrugLabels,
} from "../components/DrugLabelPanel";
import { ProvenanceTag } from "../components/ProvenanceTag";
import { Panel } from "../design-system/components/Panel";
import { SeverityChip } from "../design-system/components/SeverityChip";
import {
  TimelineEvent,
  type TimelineEventType,
} from "../design-system/components/TimelineEvent";
import type { ParseSource } from "@shared/api";
import type { PatientStory } from "@shared/types";

type ClinicianViewProps = {
  story: PatientStory;
  source: ParseSource;
  warning?: string;
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

const SEVERITY_LABEL: Record<string, string> = {
  major: "Major",
  moderate: "Moderate",
  minor: "Minor",
};

const TIMELINE_TYPES = new Set<TimelineEventType>([
  "symptom",
  "medication",
  "visit",
  "procedure",
  "history",
  "other",
]);

/** Narrow the free-text event type onto the design-system timeline palette. */
function timelineType(type: string): TimelineEventType {
  const t = type.toLowerCase() as TimelineEventType;
  return TIMELINE_TYPES.has(t) ? t : "other";
}

export default function ClinicianView({ story, source }: ClinicianViewProps) {
  const brief = buildClinicianBrief(story);
  const drugNames = story.medications.map((m) => m.normalizedName);
  const fda = useDrugLabels(drugNames);

  return (
    <section className="clinician-view" aria-labelledby="clinician-heading">
      <header className="clinician-header">
        <h2 id="clinician-heading">Clinician view</h2>
        <p className="clinician-subtitle">
          Structured triage — questions only, never diagnosis
        </p>
        <p className="meta">
          Parse source: <strong>{source}</strong>
        </p>
      </header>

      {story.redFlags.length > 0 && (
        <div
          className="rf-chip-row"
          role="alert"
          aria-label="Red flag alerts"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--sp-2)",
            alignItems: "center",
            margin: "var(--sp-4) 0",
          }}
        >
          {story.redFlags.map((flag) => (
            <SeverityChip key={flag.id} level={flag.urgency} pill>
              {flag.message}
              <ProvenanceTag provenance="deterministic-rule" ruleId={flag.ruleId} compact />
            </SeverityChip>
          ))}
        </div>
      )}

      <Panel
        title="Clinical summary"
        note={<ProvenanceTag provenance="deterministic-rule" ruleId="clinician-brief" compact />}
        style={{ marginTop: "var(--sp-4)" }}
      >
        <p className="summary-text">{brief.summary}</p>
      </Panel>

      <Panel
        title="Timeline"
        count={story.timeline.length}
        note="Events labeled by type — color is supplementary"
        style={{ marginTop: "var(--sp-4)" }}
      >
        <ol
          className="timeline-track"
          aria-label="Patient timeline"
          style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--sp-2)" }}
        >
          {story.timeline.map((evt, index) => (
            <TimelineEvent
              key={evt.id}
              type={timelineType(evt.type)}
              label={evt.label}
              index={index + 1}
              timeRef={evt.timeRef}
              severityHint={evt.severityHint}
              provenance={evt.provenance}
            />
          ))}
        </ol>
      </Panel>

      {brief.followUpQuestions.length > 0 && (
        <Panel
          title="Suggested follow-up questions"
          count={brief.followUpQuestions.length}
          note="Rule-based prompts for history-taking — not diagnoses or treatment orders"
          style={{ marginTop: "var(--sp-4)" }}
        >
          <ol className="follow-up-list">
            {brief.followUpQuestions.map((q) => (
              <li key={q.id} className={`follow-up-item priority-${q.priority}`}>
                <span className={`priority-badge priority-${q.priority}`}>
                  {PRIORITY_LABEL[q.priority]}
                </span>
                <p className="follow-up-question">{q.question}</p>
                <p className="follow-up-rationale muted">{q.rationale}</p>
                <ProvenanceTag provenance={q.provenance} ruleId={q.ruleId} compact />
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <Panel
        title="Medications"
        count={story.medications.length}
        note="DDInter severity (deterministic) + openFDA label interaction text (live, 24h cache)"
        style={{ marginTop: "var(--sp-4)" }}
      >
        <DrugLabelAttribution
          attribution={fda.attribution}
          warning={fda.warning}
          error={fda.error}
        />
        <ul className="med-list">
          {story.medications.map((med) => {
            const hits = interactionsForMed(med, story.interactions);
            const label = fda.byDrug.get(med.normalizedName.toLowerCase());
            return (
              <li key={med.normalizedName} className="med-card">
                <div className="med-header">
                  <strong>{med.name}</strong>
                  {med.dose && <span className="muted"> — {med.dose}</span>}
                  {med.frequency && <span className="muted"> ({med.frequency})</span>}
                  <ProvenanceTag provenance={med.provenance} compact />
                </div>
                {hits.length > 0 && (
                  <div
                    className="interaction-chips"
                    aria-label="Drug interactions"
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "var(--sp-2)",
                      marginTop: "var(--sp-2)",
                    }}
                  >
                    {hits.map((ix) => {
                      const partner = otherDrugInInteraction(med, ix);
                      return (
                        <span
                          key={ix.ruleId}
                          title={`${ix.mechanism}${ix.management ? ` — ${ix.management}` : ""}`}
                        >
                          <SeverityChip level={ix.severity}>
                            interaction with {partner}
                            <ProvenanceTag provenance={ix.provenance} ruleId={ix.ruleId} compact />
                          </SeverityChip>
                        </span>
                      );
                    })}
                  </div>
                )}
                <DrugLabelExcerpt label={label} loading={fda.loading} />
              </li>
            );
          })}
        </ul>
      </Panel>

      {(story.interactions.length > 0 || story.symptoms.length > 0) && (
        <details className="panel clinician-details" style={{ marginTop: "var(--sp-4)" }}>
          <summary>Symptoms &amp; interactions detail</summary>
          {story.symptoms.length > 0 && (
            <div className="detail-block">
              <h4>Symptoms ({story.symptoms.length})</h4>
              <ul>
                {story.symptoms.map((s) => (
                  <li key={s.normalizedTerm}>
                    {s.isRedFlag && (
                      <span className="chip chip-danger">
                        <span aria-hidden="true">! </span>
                        Red flag
                      </span>
                    )}
                    {s.term}
                    {s.onset && <span className="muted"> · onset {s.onset}</span>}
                    <ProvenanceTag provenance={s.provenance} compact />
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
                  <li
                    key={ix.ruleId}
                    className={`flag-item severity-row-${ix.severity}`}
                  >
                    <span className={`ix-chip severity-${ix.severity}`}>
                      <span aria-hidden="true">! </span>
                      {SEVERITY_LABEL[ix.severity] ?? ix.severity}
                    </span>
                    <span className="flag-message">
                      {ix.drugA} + {ix.drugB}
                    </span>
                    <span className="flag-meta">{ix.mechanism}</span>
                    {ix.management && (
                      <span className="flag-meta">Management: {ix.management}</span>
                    )}
                    <ProvenanceTag provenance={ix.provenance} ruleId={ix.ruleId} compact />
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
