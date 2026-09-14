import type { ReactNode } from "react";
import styles from "./controls.module.css";
import { Icon } from "./Icon";

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  decreaseLabel,
  increaseLabel,
}: StepperProps): ReactNode {
  return (
    <span className={styles.stepperGroup}>
      <output className={styles.stepperValue} aria-live="polite">
        {value}
      </output>
      <span className={styles.stepper}>
        <button
          type="button"
          aria-label={decreaseLabel}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Icon name="minus" size={14} />
        </button>
        <span className={styles.stepperDivider} aria-hidden="true" />
        <button
          type="button"
          aria-label={increaseLabel}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Icon name="plus" size={14} />
        </button>
      </span>
    </span>
  );
}
