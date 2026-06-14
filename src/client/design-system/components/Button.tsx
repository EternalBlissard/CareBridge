import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual emphasis. @default "primary" */
  variant?: "primary" | "secondary" | "ghost";
  /** Control size. @default "md" */
  size?: "md" | "lg";
  /** Optional leading icon (decorative). */
  iconLeft?: React.ReactNode;
  /** Optional trailing icon (decorative). */
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * CareBridge button hierarchy: primary (brand fill), secondary (outline),
 * ghost (text). Subtle 1px lift on hover; honors disabled.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  iconLeft,
  iconRight,
  className = "",
  style,
  ...rest
}: ButtonProps) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--sp-2)",
    font: "inherit",
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    lineHeight: 1.1,
    border: "2px solid transparent",
    borderRadius: "var(--r-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: disabled ? 0.6 : 1,
    transition: "var(--transition-button)",
    padding: size === "lg" ? "0.85rem 1.7rem" : "0.6rem 1.25rem",
    fontSize: size === "lg" ? "1.05rem" : "1rem",
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: { background: "var(--cb-brand)", color: "#fff", boxShadow: "var(--shadow-md)" },
    secondary: {
      background: "var(--cb-surface)",
      color: "var(--cb-brand-dark)",
      borderColor: "var(--cb-brand)",
    },
    ghost: { background: "transparent", color: "var(--cb-brand)", borderColor: "transparent" },
  };

  const [hover, setHover] = React.useState(false);
  const hoverStyle: React.CSSProperties | null =
    hover && !disabled
      ? variant === "primary"
        ? {
            background: "var(--cb-brand-dark)",
            boxShadow: "var(--shadow-lg)",
            transform: "translateY(-1px)",
          }
        : { background: "var(--cb-brand-tint)" }
      : null;

  return (
    <button
      type={type}
      disabled={disabled}
      className={className}
      style={{ ...base, ...variants[variant], ...hoverStyle, ...style }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...rest}
    >
      {iconLeft && (
        <span aria-hidden="true" style={{ display: "inline-flex" }}>
          {iconLeft}
        </span>
      )}
      {children}
      {iconRight && (
        <span aria-hidden="true" style={{ display: "inline-flex" }}>
          {iconRight}
        </span>
      )}
    </button>
  );
}
