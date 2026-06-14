import { useEffect, useRef, useState } from "react";
import ClinicianView from "./views/ClinicianView";
import PatientView from "./views/PatientView";
import Landing from "./views/Landing";
import DegradedBanner from "./components/DegradedBanner";
import SafetyBanner from "./components/SafetyBanner";
import { Button } from "./design-system/components/Button";
import { TextArea } from "./design-system/components/TextArea";
import { Select } from "./design-system/components/Select";
import { ToggleButton } from "./design-system/components/ToggleButton";
import { ViewTabs } from "./design-system/components/ViewTabs";
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
        <ToggleButton pressed={largeText} onClick={toggleLargeText}>
          {largeText ? "Standard text size" : "Larger text"}
        </ToggleButton>
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
                <Select
                  id="sample-picker"
                  label="Demo patient"
                  hideLabel
                  value={sample?.id ?? ""}
                  onChange={(e) => void loadSampleById(e.target.value)}
                  aria-label="Choose demo patient"
                >
                  {samples.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName ?? p.id}
                    </option>
                  ))}
                </Select>
              )}
              {sample && (
                <button type="button" className="link-btn" onClick={loadSample}>
                  Reload sample text
                </button>
              )}
            </div>
          </div>
          <TextArea
            id="narrative"
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={sample ? undefined : "Loading sample patient…"}
            hint="For demo only — use the synthetic sample. Do not enter real patient information."
          />
          <Button
            onClick={handleParse}
            disabled={loading || !text.trim()}
            style={{ marginTop: "var(--sp-3)" }}
          >
            {loading ? "Parsing…" : "Parse narrative"}
          </Button>
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
            <ViewTabs
              ariaLabel="Result view"
              value={viewMode}
              onChange={(id) => setViewMode(id as ViewMode)}
              tabs={[
                { id: "clinician", label: "Clinician" },
                { id: "patient", label: "Patient" },
              ]}
              style={{ margin: "var(--sp-4) 0" }}
            />

            {viewMode === "clinician" && (
              <div role="tabpanel" aria-label="Clinician view" tabIndex={0}>
                <ClinicianView
                  story={result.story}
                  source={result.source}
                  warning={result.warning}
                />
              </div>
            )}

            {viewMode === "patient" && (
              <div role="tabpanel" aria-label="Patient view" tabIndex={0}>
                <PatientView story={result.story} />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
