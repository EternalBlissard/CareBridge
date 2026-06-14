import React from "react";

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "style"> {
  label?: string;
  id: string;
  /** Keep the label for screen readers only. */
  hideLabel?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** Labeled native select — used for the demo-patient picker. */
export function Select({
  label,
  id,
  value,
  onChange,
  children,
  hideLabel = false,
  className = "",
  style,
  ...rest
}: SelectProps) {
  return (
    <label
      className={className}
      htmlFor={id}
      style={{ display: "inline-flex", flexDirection: "column", gap: "var(--sp-1)", ...style }}
    >
      {label && (
        <span
          style={
            hideLabel
              ? { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }
              : { fontWeight: 600, fontSize: "var(--fs-sm)" }
          }
        >
          {label}
        </span>
      )}
      <select
        id={id}
        value={value}
        onChange={onChange}
        style={{
          padding: "0.45rem 0.6rem",
          border: "2px solid var(--cb-ink-muted)",
          borderRadius: "var(--r-sm)",
          font: "inherit",
          fontFamily: "var(--font-sans)",
          background: "var(--cb-surface)",
          color: "var(--cb-ink)",
        }}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}
