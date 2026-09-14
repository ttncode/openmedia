import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./controls.module.css";
import { Icon, type IconName } from "./Icon";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: IconName;
  size?: "small" | "regular";
}

export function IconButton({
  label,
  icon,
  size = "regular",
  className,
  type = "button",
  ...rest
}: IconButtonProps): ReactNode {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`${styles.iconButton} ${size === "small" ? styles.small : ""} ${className ?? ""}`}
      {...rest}
    >
      <Icon name={icon} size={size === "small" ? 14 : 18} />
    </button>
  );
}
