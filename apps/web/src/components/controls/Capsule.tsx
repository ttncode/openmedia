import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./controls.module.css";
import { Icon, type IconName } from "./Icon";

type CapsuleVariant = "gray" | "primary" | "tinted" | "plain" | "destructive";

interface CapsuleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CapsuleVariant;
  size?: "regular" | "large";
  icon?: IconName;
}

export function Capsule({
  variant = "gray",
  size = "regular",
  icon,
  className,
  children,
  type = "button",
  ...rest
}: CapsuleProps): ReactNode {
  const classes = [
    styles.capsule,
    styles[variant],
    size === "large" ? styles.large : "",
    className ?? "",
  ]
    .join(" ")
    .trim();
  return (
    <button type={type} className={classes} {...rest}>
      {icon ? <Icon name={icon} size={size === "large" ? 18 : 16} /> : null}
      {children}
    </button>
  );
}
