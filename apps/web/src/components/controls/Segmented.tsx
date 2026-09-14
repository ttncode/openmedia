"use client";

import {
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import styles from "./controls.module.css";
import { Icon, type IconName } from "./Icon";

export interface SegmentOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: IconName;
}

interface SegmentedProps<T extends string> {
  label: string;
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

const ARROW_STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>): ReactNode {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const style = {
    "--count": options.length,
    "--index": index,
  } as CSSProperties;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = ARROW_STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    buttons.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={styles.segmented}
      style={style}
      onKeyDown={handleKeyDown}
    >
      <span className={styles.segmentedThumb} aria-hidden="true" />
      {options.map((option, optionIndex) => (
        <button
          key={option.value}
          ref={(element) => {
            buttons.current[optionIndex] = element;
          }}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          onClick={() => onChange(option.value)}
        >
          {option.icon ? <Icon name={option.icon} size={15} /> : null}
          {option.label}
        </button>
      ))}
    </div>
  );
}
