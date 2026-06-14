import React from "react";

export interface ViewTabsProps {
  /** Ordered tabs. */
  tabs: Array<{ id: string; label: React.ReactNode }>;
  /** Selected tab id. */
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  style?: React.CSSProperties;
}

/**
 * Segmented view tabs — the clinician/patient toggle. Accessible tablist with
 * arrow-key roving focus; the active tab fills brand-dark.
 */
export function ViewTabs({ tabs, value, onChange, ariaLabel = "View", style }: ViewTabsProps) {
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.id === value);
    const next =
      e.key === "ArrowRight" ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      style={{ display: "flex", gap: "0.5rem", ...style }}
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            style={{
              padding: "0.5rem 1rem",
              border: "2px solid",
              borderColor: active ? "var(--cb-brand-dark)" : "var(--cb-ink-muted)",
              borderRadius: "var(--r-md)",
              background: active ? "var(--cb-brand-dark)" : "var(--cb-surface)",
              color: active ? "#fff" : "var(--cb-ink)",
              font: "inherit",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
