import { useEffect, useState } from "react";
import type { ParseResponse } from "@shared/api";
import type { PatientNarrative } from "@shared/narrative";

type HealthResponse = {
  ok: boolean;
  service: string;
};

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [sample, setSample] = useState<PatientNarrative | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<HealthResponse>;
      })
      .then(setHealth)
      .catch((err: unknown) => {
        setHealthError(err instanceof Error ? err.message : "Server unreachable");
      });

    fetch("/api/synthetic-patient/default")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<PatientNarrative>;
      })
      .then((patient) => {
        setSample(patient);
        setText(patient.rawText);
      })
      .catch(() => {
        setHealthError((prev) => prev ?? "Could not load Synthea sample patient");
      });
  }, []);

  function loadSample() {
    if (sample) setText(sample.rawText);
  }

  async function handleParse() {
    setLoading(true);
    setParseError(null);
    setResult(null);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as ParseResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setResult(data);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setLoading(false);
    }
  }

  const { story } = result ?? {};

  return (
    <main className="app">
      <header>
        <h1>CareBridge</h1>
        <p className="tagline">Text in → structured timeline + med list</p>
      </header>

      <aside className="safety-banner" role="note">
        <strong>Synthetic data only.</strong> Do not enter real patient information.
        {sample && (
          <span className="banner-detail">
            {" "}Loaded: {sample.displayName} (Synthea {sample.syntheaPatientId?.slice(0, 8)}…)
          </span>
        )}
      </aside>

      <section className="status-card" aria-live="polite">
        <h2>Server status</h2>
        {health && <p className="ok">API connected ({health.service})</p>}
        {healthError && <p className="error">API error: {healthError}</p>}
        {!health && !healthError && <p>Checking API…</p>}
      </section>

      <section className="parse-section">
        <div className="parse-header">
          <label htmlFor="narrative">Patient narrative</label>
          {sample && (
            <button type="button" className="link-btn" onClick={loadSample}>
              Reload Synthea sample
            </button>
          )}
        </div>
        <textarea
          id="narrative"
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={sample ? undefined : "Loading sample patient…"}
        />
        <button type="button" onClick={handleParse} disabled={loading || !text.trim()}>
          {loading ? "Parsing…" : "Parse narrative"}
        </button>
      </section>

      {parseError && (
        <p className="error" role="alert">
          {parseError}
        </p>
      )}

      {result && (
        <section className="results" aria-live="polite">
          <p className="meta">
            Source: <strong>{result.source}</strong>
            {result.warning && <span className="warning"> — {result.warning}</span>}
          </p>

          {(story?.redFlags.length ?? 0) > 0 && (
            <div className="panel red-flags-panel" role="alert">
              <h2>Red flags ({story?.redFlags.length})</h2>
              <p className="panel-note">Deterministic rules only — not AI-generated</p>
              <ul className="flag-list">
                {story?.redFlags.map((flag) => (
                  <li key={flag.id} className={`flag-item urgency-${flag.urgency}`}>
                    <span className="flag-urgency" aria-label={`Urgency: ${flag.urgency}`}>
                      ⚠ {flag.urgency}
                    </span>
                    <span className="flag-message">{flag.message}</span>
                    <span className="flag-meta">
                      Matched: {flag.triggeringTerms.join(", ")} · rule {flag.ruleId}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="panel">
            <h2>Timeline ({story?.timeline.length ?? 0})</h2>
            <ul>
              {story?.timeline.map((evt) => (
                <li key={evt.id}>
                  <span className="chip">{evt.type}</span>
                  {evt.label}
                  {evt.timeRef && <span className="muted"> · {evt.timeRef}</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="panel">
            <h2>Medications ({story?.medications.length ?? 0})</h2>
            <ul>
              {story?.medications.map((med) => (
                <li key={med.normalizedName}>
                  <strong>{med.name}</strong>
                  {med.dose && ` — ${med.dose}`}
                  {med.frequency && ` (${med.frequency})`}
                </li>
              ))}
            </ul>
          </div>

          <div className="panel">
            <h2>Symptoms ({story?.symptoms.length ?? 0})</h2>
            <ul>
              {story?.symptoms.map((s) => (
                <li key={s.normalizedTerm}>
                  {s.isRedFlag && (
                    <span className="chip chip-danger" aria-label="Red flag symptom">
                      ⚠ red flag
                    </span>
                  )}
                  {s.term}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
