import { useEffect, useState } from "react";
import ClinicianView from "./views/ClinicianView";
import type { ParseResponse } from "@shared/api";
import type { PatientNarrative } from "@shared/narrative";

type HealthResponse = {
  ok: boolean;
  service: string;
};

type ViewMode = "clinician" | "patient";

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [sample, setSample] = useState<PatientNarrative | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("clinician");

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
      setViewMode("clinician");
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <header>
        <h1>CareBridge</h1>
        <p className="tagline">Text in → structured timeline + med list</p>
      </header>

      <aside className="safety-banner" role="note">
        <strong>Not a diagnostic tool.</strong> Synthetic data only — do not enter real patient
        information.
        {sample && (
          <span className="banner-detail">
            {" "}
            Loaded: {sample.displayName} (synthetic sample)
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
          <div className="view-toggle" role="tablist" aria-label="Result view">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "clinician"}
              className={viewMode === "clinician" ? "view-tab active" : "view-tab"}
              onClick={() => setViewMode("clinician")}
            >
              Clinician
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "patient"}
              className={viewMode === "patient" ? "view-tab active" : "view-tab"}
              onClick={() => setViewMode("patient")}
              disabled
              title="Patient view — Phase 2 step 2"
            >
              Patient (coming next)
            </button>
          </div>

          {viewMode === "clinician" && (
            <ClinicianView
              story={result.story}
              source={result.source}
              warning={result.warning}
            />
          )}

          {viewMode === "patient" && (
            <p className="panel-note">Patient view ships in the next Phase 2 step.</p>
          )}
        </section>
      )}
    </main>
  );
}
