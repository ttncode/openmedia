import type { CSSProperties, ReactNode } from "react";
import styles from "./queue.module.css";

export function ProgressRing({
  progress,
  waiting = false,
}: {
  progress: number | null;
  waiting?: boolean;
}): ReactNode {
  const style = { "--progress": progress ?? 0 } as CSSProperties;
  return (
    <span
      className={`${styles.ring} ${waiting ? styles.waiting : ""}`}
      style={style}
      aria-hidden="true"
    >
      <svg viewBox="0 0 36 36">
        <circle
          className={styles.ringTrack}
          cx="18"
          cy="18"
          r="15.5"
          pathLength="100"
        />
        <circle
          className={styles.ringValue}
          cx="18"
          cy="18"
          r="15.5"
          pathLength="100"
        />
      </svg>
      <span className={styles.ringStop} />
    </span>
  );
}
