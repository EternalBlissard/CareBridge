import React from "react";

export interface ToggleButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  /** Pressed (on) state — fills with brand color. */
  pressed?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Toggle button driven by aria-pressed — CareBridge's accessibility pattern
 * (e.g. the "Larger text" control). Filled when pressed.
 */
export function ToggleButton({
  children,
  pressed = false,
  onClick,
  className = "",
  style,
  ...rest
}: ToggleButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={className}
      style={{
        padding: "0.55rem 1rem",
        border: "2px solid var(--cb-brand)",
        borderRadius: "var(--r-md)",
        background: pressed ? "var(--cb-brand)" : "var(--cb-surface)",
        color: pressed ? "#fff" : "var(--cb-brand-dark)",
        font: "inherit",
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
        cursor: "pointer",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
