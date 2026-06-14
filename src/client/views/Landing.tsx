import { Button } from "../design-system/components/Button";

type LandingProps = {
  onLaunch: () => void;
  /** Optional demo video URL — secondary CTA hidden until provided. */
  videoUrl?: string;
};

type Feature = {
  icon: string;
  title: string;
  body: string;
  axis: string;
  highlight?: boolean;
};

const FEATURES: Feature[] = [
  {
    icon: "🧠",
    title: "AI structures the story",
    body:
      "gpt-4o-mini extracts a clinical timeline, medication list, and symptom terms from raw free text — language tasks only.",
    axis: "Accuracy & Relevance",
  },
  {
    icon: "🛡️",
    title: "Deterministic safety",
    body:
      "Red-flag urgency and drug-interaction severity come from curated rules + DDInter and openFDA — never the language model.",
    axis: "Reliability & Safety",
    highlight: true,
  },
  {
    icon: "♿",
    title: "Accessibility-first",
    body:
      "Screen-reader narration, WCAG AA+ contrast, a larger-text mode, and full keyboard navigation are built in, not bolted on.",
    axis: "Accessibility",
  },
];

export default function Landing({ onLaunch, videoUrl }: LandingProps) {
  return (
    <div className="landing">
      <main>
        <section className="hero" aria-labelledby="hero-heading">
        <div className="landing-wrap">
          <p className="hero-eyebrow">Microsoft Agents League · Creative Apps</p>
          <h1 id="hero-heading" className="hero-title">
            CareBridge
          </h1>
          <p className="hero-sub">
            Turns a messy free-text patient story into a structured clinical
            timeline and an accessible medication-safety briefing — with safety
            checks the AI never gets to override.
          </p>
          <div className="hero-cta">
            <Button variant="primary" size="lg" onClick={onLaunch}>
              Try the live demo
            </Button>
            {videoUrl && (
              <a
                className="hero-cta-link"
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.85rem 1.7rem",
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  borderRadius: "var(--r-md)",
                  border: "2px solid var(--cb-brand)",
                  background: "var(--cb-surface)",
                  color: "var(--cb-brand-dark)",
                  textDecoration: "none",
                }}
              >
                Watch the demo video
              </a>
            )}
          </div>
          <p className="hero-trust">
            <span className="hero-trust-item">🔒 Synthetic data only</span>
            <span className="hero-trust-sep" aria-hidden="true">
              ·
            </span>
            <span className="hero-trust-item">Not medical advice</span>
            <span className="hero-trust-sep" aria-hidden="true">
              ·
            </span>
            <span className="hero-trust-item">openFDA · DDInter · Synthea</span>
          </p>
        </div>
      </section>

      <section className="problem" aria-labelledby="problem-heading">
        <div className="landing-wrap">
          <h2 id="problem-heading" className="section-title">
            The problem
          </h2>
          <p className="problem-text">
            Patients describe symptoms and medications in free text. Under time
            pressure a clinician has to rebuild the timeline and spot drug risks
            by hand — and it is easy to miss a red flag or a dangerous
            interaction buried in the story.
          </p>
        </div>
      </section>

      <section className="features" aria-labelledby="features-heading">
        <div className="landing-wrap">
          <h2 id="features-heading" className="section-title">
            How CareBridge helps
          </h2>
          <ul className="feature-grid">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className={
                  f.highlight ? "feature-card feature-card-safety" : "feature-card"
                }
              >
                <span className="feature-icon" aria-hidden="true">
                  {f.icon}
                </span>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-body">{f.body}</p>
                <p className="feature-axis">Judged on: {f.axis}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cta-band" aria-labelledby="cta-heading">
        <div className="landing-wrap">
          <h2 id="cta-heading" className="section-title">
            See it on a synthetic patient
          </h2>
          <p className="cta-text">
            A Synthea-style sample is pre-loaded — parse it, switch between the
            clinician and patient views, and let the screen reader narrate.
          </p>
          <Button variant="primary" size="lg" onClick={onLaunch}>
            Try the live demo
          </Button>
        </div>
      </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-wrap">
          <p>
            <a
              href="https://github.com/EternalBlissard/CareBridge"
              target="_blank"
              rel="noreferrer"
            >
              GitHub repository
            </a>{" "}
            · MIT License
          </p>
          <p className="landing-footer-note">
            Demo triage assistant — not a diagnostic tool, not medical advice.
            Synthetic data only. Drug data: openFDA (CC0), DDInter, MITRE
            Synthea.
          </p>
        </div>
      </footer>
    </div>
  );
}
