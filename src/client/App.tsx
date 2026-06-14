import { useEffect, useRef, useState } from "react";
import ClinicianView from "./views/ClinicianView";
import PatientView from "./views/PatientView";
import Landing from "./views/Landing";
import DegradedBanner from "./components/DegradedBanner";
import SafetyBanner from "./components/SafetyBanner";
import { useLargeText } from "./hooks/useLargeText";
import { friendlyFetchError } from "./utils/errors";
import type { ParseResponse } from "@shared/api";
import type { PatientNarrative } from "@shared/narrative";

type HealthResponse = {
  ok: boolean;
  service: string;
};

type ViewMode = "clinician" | "patient";
type Screen = "landing" | "app";

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [sample, setSample] = useState<PatientNarrative | null>(null);
  const [samples, setSamples] = useState<Pick<PatientNarrative, "id" | "displayName">[]>([]);
  const [text, setText] = useState("");
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("clinician");
  const [timelineAnnouncement, setTimelineAnnouncement] = useState("");
  const { largeText, toggle: toggleLargeText } = useLargeText();
  const clinicianTabRef = useRef<HTMLButtonElement>(null);
  const patientTabRef = useRef<HTMLButtonElement>(null);
  const appHeadingRef = useRef<HTMLHeadingElement>(null);

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

    fetch("/api/synthetic-patient")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ patients: Pick<PatientNarrative, "id" | "displayName">[] }>;
      })
      .then((data) => setSamples(data.patients))
      .catch(() => {
        /* list optional */
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

  // Route-like focus management: when the user launches the app from the
  // landing screen, move focus to the app heading so screen-reader and
  // keyboard users land in the new context instead of being stranded.
  useEffect(() => {
    if (screen === "app") appHeadingRef.current?.focus();
  }, [screen]);

  function loadSample() {
    if (sample) setText(sample.rawText);
  }

  async function loadSampleById(id: string) {
    try {
      const res = await fetch(`/api/synthetic-patient/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const patient = (await res.json()) as PatientNarrative;
      setSample(patient);
      setText(patient.rawText);
      setResult(null);
      setParseError(null);
    } catch {
      setParseError("Could not load selected sample patient");
    }
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
      const data = (await res.json()) as ParseResponse & { error?: string; warning?: string };
      if (!res.ok) {
        throw new Error(friendlyFetchError(res.status, data));
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
      const msg = err instanceof Error ? err.message : "Parse failed";
      setParseError(msg);
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

  if (screen === "landing") {
    return (
      <div className="app app-landing">
        <Landing onLaunch={() => setScreen("app")} />
      </div>
    );
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header role="banner" className="site-header">
        <div className="site-header-row">
          <h1 ref={appHeadingRef} tabIndex={-1}>
            CareBridge
          </h1>
          <button
            type="button"
            className="link-btn home-link"
            onClick={() => setScreen("landing")}
          >
            ← Home
          </button>
        </div>
        <p className="tagline">Text in → structured timeline + med list</p>
      </header>

      <SafetyBanner sample={sample} />

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
            <div className="parse-header-actions">
              {samples.length > 1 && (
                <label className="sample-picker">
                  <span className="sr-only">Demo patient</span>
                  <select
                    value={sample?.id ?? ""}
                    onChange={(e) => void loadSampleById(e.target.value)}
                    aria-label="Choose demo patient"
                  >
                    {samples.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.displayName ?? p.id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {sample && (
                <button type="button" className="link-btn" onClick={loadSample}>
                  Reload sample text
                </button>
              )}
            </div>
          </div>
          <textarea
            id="narrative"
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={sample ? undefined : "Loading sample patient…"}
            aria-describedby="narrative-hint"
          />
          <p id="narrative-hint" className="narrative-safety-hint">
            For demo only — use the synthetic sample. Do not enter real patient information.
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

        {loading && (
          <div className="skeleton-stack" aria-hidden="true">
            <div className="skeleton-block skeleton-sm" />
            <div className="skeleton-block skeleton-tall" />
            <div className="skeleton-block skeleton-md" />
          </div>
        )}

        {result && (
          <section className="results" aria-labelledby="results-heading">
            <h2 id="results-heading" className="sr-only">
              Parsed results
            </h2>

            {result.warning && <DegradedBanner message={result.warning} />}
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
