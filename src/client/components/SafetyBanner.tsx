import type { PatientNarrative } from "@shared/narrative";

type SafetyBannerProps = {
  sample?: PatientNarrative | null;
};

export default function SafetyBanner({ sample }: SafetyBannerProps) {
  return (
    <aside className="safety-banner" role="note" aria-label="Safety notice">
      <p className="safety-banner-lead">
        <strong>Not a diagnostic tool.</strong> <strong>Not medical advice.</strong>
      </p>
      <p className="safety-banner-detail">
        Demo uses synthetic patient data only — <strong>do not enter real patient information</strong>.
        {sample && (
          <span className="banner-detail">
            {" "}
            Loaded sample: {sample.displayName}.
          </span>
        )}
      </p>
    </aside>
  );
}
