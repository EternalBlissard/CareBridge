import { useEffect, useState } from "react";
import type { ParseResponse } from "@shared/api";

type HealthResponse = {
  ok: boolean;
  service: string;
};

const SAMPLE_TEXT =
  "68-year-old reports chest tightness and shortness of breath for 3 days. " +
  "Taking warfarin 5 mg daily and ibuprofen 400 mg as needed for knee pain. " +
  "Also on metformin 500 mg twice daily. Feels dizzy when standing.";

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [text, setText] = useState(SAMPLE_TEXT);
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
  }, []);

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

      <section className="status-card" aria-live="polite">
        <h2>Server status</h2>
        {health && <p className="ok">API connected ({health.service})</p>}
        {healthError && <p className="error">API error: {healthError}</p>}
        {!health && !healthError && <p>Checking API…</p>}
      </section>

      <section className="parse-section">
        <label htmlFor="narrative">Patient narrative (synthetic only)</label>
        <textarea
          id="narrative"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
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
                <li key={s.normalizedTerm}>{s.term}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
