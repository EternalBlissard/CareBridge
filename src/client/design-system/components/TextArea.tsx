import React from "react";

export interface TextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "style"> {
  /** Visible field label. */
  label?: string;
  /** Required — links label, textarea, and hint. */
  id: string;
  /** Helper text below the field (e.g. the synthetic-data warning). */
  hint?: string;
  rows?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Labeled multi-line text input with an accessible hint line. */
export function TextArea({
  label,
  id,
  hint,
  rows = 8,
  value,
  onChange,
  placeholder,
  className = "",
  style,
  ...rest
}: TextAreaProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className} style={{ display: "block", ...style }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            display: "block",
            fontWeight: 600,
            marginBottom: "var(--sp-2)",
            color: "var(--cb-ink)",
          }}
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-describedby={hintId}
        style={{
          width: "100%",
          padding: "0.75rem",
          border: "1px solid var(--cb-line-strong)",
          borderRadius: "var(--r-md)",
          font: "inherit",
          fontFamily: "var(--font-sans)",
          color: "var(--cb-ink)",
          resize: "vertical",
        }}
        {...rest}
      />
      {hint && (
        <p
          id={hintId}
          style={{ margin: "0.5rem 0 0", fontSize: "var(--fs-sm)", color: "var(--cb-ink-soft)" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
