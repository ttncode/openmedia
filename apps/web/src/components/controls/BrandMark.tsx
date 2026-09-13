import type { ReactNode } from "react";
import styles from "./controls.module.css";

export const LOGO_FRAME_PATH =
  "M9 22 V9 H22 M42 9 H55 V22 M55 42 V55 H42 M22 55 H9 V42";
export const LOGO_WAVE_PATH = "M23 27 V37 M32 20 V44 M41 25 V39";

export function BrandMark({ size = 26 }: { size?: number }): ReactNode {
  return (
    <svg
      className={styles.brandMark}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <g
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path className={styles.brandFrame} d={LOGO_FRAME_PATH} />
        <path className={styles.brandWave} d={LOGO_WAVE_PATH} />
      </g>
    </svg>
  );
}
