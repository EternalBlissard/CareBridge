import { useEffect, useRef, useState } from "react";
import ClinicianView from "./views/ClinicianView";
import PatientView from "./views/PatientView";
import { useLargeText } from "./hooks/useLargeText";
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
  const [timelineAnnouncement, setTimelineAnnouncement] = useState("");
  const { largeText, toggle: toggleLargeText } = useLargeText();
  const clinicianTabRef = useRef<HTMLButtonElement>(null);
  const patientTabRef = useRef<HTMLButtonElement>(null);

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
    setTimelineAnnouncement("");
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
      const { timeline, medications, redFlags } = data.story;
      setTimelineAnnouncement(
        `Timeline generated: ${timeline.length} event${timeline.length === 1 ? "" : "s"}, ` +
          `${medications.length} medication${medications.length === 1 ? "" : "s"}` +
          (redFlags.length > 0
            ? `, ${redFlags.length} red flag${redFlags.length === 1 ? "" : "s"} detected`
            : ""),
      );
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setLoading(false);
    }
  }

  function handleViewTabKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next: ViewMode = viewMode === "clinician" ? "patient" : "clinician";
    setViewMode(next);
    (next === "clinician" ? clinicianTabRef : patientTabRef).current?.focus();
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header role="banner" className="site-header">
        <h1>CareBridge</h1>
        <p className="tagline">Text in → structured timeline + med list</p>
      </header>

      <aside className="safety-banner" role="note" aria-label="Safety notice">
        <strong>Not a diagnostic tool.</strong> Synthetic data only — do not enter real patient
        information.
        {sample && (
          <span className="banner-detail">
            {" "}
            Loaded: {sample.displayName} (synthetic sample)
          </span>
        )}
      </aside>

      <nav className="a11y-toolbar" aria-label="Accessibility options">
        <button
          type="button"
          className="a11y-toggle"
          aria-pressed={largeText}
          onClick={toggleLargeText}
        >
          {largeText ? "Standard text size" : "Larger text"}
        </button>
      </nav>

      <main id="main-content" tabIndex={-1}>
        <section className="status-card" aria-labelledby="status-heading">
          <h2 id="status-heading">Server status</h2>
          {health && <p className="ok">API connected ({health.service})</p>}
          {healthError && <p className="error">API error: {healthError}</p>}
          {!health && !healthError && <p>Checking API…</p>}
        </section>

        <section className="parse-section" aria-labelledby="parse-heading">
          <div className="parse-header">
            <label htmlFor="narrative" id="parse-heading">
              Patient narrative
            </label>
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
            aria-describedby="narrative-hint"
          />
          <p id="narrative-hint" className="sr-only">
            Enter or edit a synthetic patient narrative, then parse to generate a timeline.
          </p>
          <button type="button" onClick={handleParse} disabled={loading || !text.trim()}>
            {loading ? "Parsing…" : "Parse narrative"}
          </button>
        </section>

        {parseError && (
          <p className="error" role="alert">
            {parseError}
          </p>
        )}

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {timelineAnnouncement}
        </div>

        {result && (
          <section className="results" aria-labelledby="results-heading">
            <h2 id="results-heading" className="sr-only">
              Parsed results
            </h2>
            <nav
              className="view-toggle"
              role="tablist"
              aria-label="Result view"
              onKeyDown={handleViewTabKeyDown}
            >
              <button
                ref={clinicianTabRef}
                type="button"
                role="tab"
                id="tab-clinician"
                aria-selected={viewMode === "clinician"}
                aria-controls="panel-clinician"
                tabIndex={viewMode === "clinician" ? 0 : -1}
                className={viewMode === "clinician" ? "view-tab active" : "view-tab"}
                onClick={() => setViewMode("clinician")}
              >
                Clinician
              </button>
              <button
                ref={patientTabRef}
                type="button"
                role="tab"
                id="tab-patient"
                aria-selected={viewMode === "patient"}
                aria-controls="panel-patient"
                tabIndex={viewMode === "patient" ? 0 : -1}
                className={viewMode === "patient" ? "view-tab active" : "view-tab"}
                onClick={() => setViewMode("patient")}
              >
                Patient
              </button>
            </nav>

            {viewMode === "clinician" && (
              <div
                role="tabpanel"
                id="panel-clinician"
                aria-labelledby="tab-clinician"
                tabIndex={0}
              >
                <ClinicianView
                  story={result.story}
                  source={result.source}
                  warning={result.warning}
                />
              </div>
            )}

            {viewMode === "patient" && (
              <div role="tabpanel" id="panel-patient" aria-labelledby="tab-patient" tabIndex={0}>
                <PatientView story={result.story} />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
