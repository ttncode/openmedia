import type { ReactNode } from "react";
import { LOGO_FRAME_PATH, LOGO_WAVE_PATH } from "@/lib/brand";
import styles from "./controls.module.css";

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
