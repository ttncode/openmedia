import type { ReactNode } from "react";
import styles from "./controls.module.css";

export function Switch({
  checked,
  onChange,
  labelledBy,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelledBy: string;
}): ReactNode {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      className={styles.switch}
      onClick={() => onChange(!checked)}
    />
  );
}
