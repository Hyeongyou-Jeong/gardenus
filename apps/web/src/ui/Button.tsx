import React from "react";
import { color, radius, shadow, typo } from "@gardenus/shared";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  fullWidth = true,
  children,
  disabled,
  style,
  ...rest
}) => {
  const base: React.CSSProperties = {
    ...typo.button,
    borderRadius: radius.lg,
    padding: "14px 24px",
    width: fullWidth ? "100%" : "auto",
    transition: "opacity 0.15s, background 0.15s",
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: color.mint500,
      color: color.white,
      boxShadow: shadow.button,
    },
    secondary: {
      background: color.gray200,
      color: color.gray800,
    },
    ghost: {
      background: "transparent",
      color: color.mint600,
    },
  };

  return (
    <button
      disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
      {...rest}
    >
      {children}
    </button>
  );
};
