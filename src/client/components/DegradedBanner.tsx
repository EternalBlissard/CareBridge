type DegradedBannerProps = {
  message: string;
};

/** Shown when the API succeeded with a fallback (skeleton, cache, rate limit, etc.). */
export default function DegradedBanner({ message }: DegradedBannerProps) {
  return (
    <div className="degraded-banner" role="status" aria-live="polite">
      <span className="degraded-icon" aria-hidden="true">
        !
      </span>
      <p>{message}</p>
    </div>
  );
}
