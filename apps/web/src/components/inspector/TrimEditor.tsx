"use client";

import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import type { TrimRange } from "@/lib/api/types";
import { formatClock, parseClock } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Icon } from "../controls/Icon";
import styles from "./inspector.module.css";
import {
  fullRange,
  nearestEdge,
  nudgeEdge,
  secondsAtPointer,
  setEdge,
  type TrimEdge,
} from "./trim";

const FRAME_WIDTH = 92;

interface TrimEditorProps {
  duration: number;
  value: TrimRange | null;
  onChange: (range: TrimRange | null) => void;
  thumbnail: string;
}

function edgeFromTarget(target: EventTarget): TrimEdge | null {
  const edge =
    target instanceof HTMLElement
      ? target.closest<HTMLElement>("[data-edge]")?.dataset.edge
      : undefined;
  return edge === "start" || edge === "end" ? edge : null;
}

function toValue(range: TrimRange, duration: number): TrimRange | null {
  return range.start === 0 && range.end === duration ? null : range;
}

export function TrimEditor({
  duration,
  value,
  onChange,
  thumbnail,
}: TrimEditorProps): ReactNode {
  const { t } = useI18n();
  const range = value ?? fullRange(duration);
  const track = useRef<HTMLDivElement>(null);
  const handles = {
    start: useRef<HTMLButtonElement>(null),
    end: useRef<HTMLButtonElement>(null),
  };
  const [dragging, setDragging] = useState<TrimEdge | null>(null);
  const [draft, setDraft] = useState<Record<TrimEdge, string | null>>({
    start: null,
    end: null,
  });

  const commit = (next: TrimRange): void => onChange(toValue(next, duration));
  const edgeAt = (
    clientX: number,
  ): { edge: TrimEdge; seconds: number } | null => {
    const bounds = track.current?.getBoundingClientRect();
    if (!bounds) return null;
    const seconds = secondsAtPointer(clientX, bounds, duration);
    return { edge: nearestEdge(range, seconds), seconds };
  };

  const beginDrag = (event: PointerEvent<HTMLDivElement>): void => {
    const target = edgeAt(event.clientX);
    if (!target) return;
    const edge = edgeFromTarget(event.target) ?? target.edge;
    event.currentTarget.setPointerCapture(event.pointerId);
    handles[edge].current?.focus({ preventScroll: true });
    setDragging(edge);
    commit(setEdge(range, edge, target.seconds, duration));
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>): void => {
    const target = dragging ? edgeAt(event.clientX) : null;
    if (dragging && target)
      commit(setEdge(range, dragging, target.seconds, duration));
  };
  const endDrag = (): void => setDragging(null);

  const handleKey =
    (edge: TrimEdge) =>
    (event: KeyboardEvent<HTMLButtonElement>): void => {
      const next = nudgeEdge(range, edge, event.key, event.shiftKey, duration);
      if (!next) return;
      event.preventDefault();
      commit(next);
    };

  const commitTyped = (edge: TrimEdge): void => {
    const text = draft[edge];
    setDraft((current) => ({ ...current, [edge]: null }));
    if (text === null) return;
    const seconds = parseClock(text);
    if (seconds === null || seconds > duration) return;
    commit(setEdge(range, edge, seconds, duration));
  };

  const timeField = (edge: TrimEdge): ReactNode => (
    <label
      className={`${styles.timeField} ${edge === "end" ? styles.timeFieldEnd : ""}`}
    >
      {edge === "start" ? t.inspector.trimStart : t.inspector.trimEnd}
      <input
        inputMode="numeric"
        autoComplete="off"
        value={draft[edge] ?? formatClock(range[edge])}
        onChange={(event) =>
          setDraft((current) => ({
            ...current,
            [edge]: event.target.value,
          }))
        }
        onBlur={() => commitTyped(edge)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commitTyped(edge);
        }}
      />
    </label>
  );

  const startPercent = (range.start / duration) * 100;
  const endPercent = (range.end / duration) * 100;
  const filmstrip = thumbnail
    ? {
        backgroundImage: `url(${JSON.stringify(thumbnail)})`,
        backgroundSize: `${FRAME_WIDTH}px 100%`,
      }
    : undefined;

  return (
    <div className={`${styles.trim} ${dragging ? styles.dragging : ""}`}>
      <div
        ref={track}
        className={styles.trimTrack}
        style={filmstrip}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span
          className={styles.trimShadeStart}
          style={{ width: `${startPercent}%` }}
        />
        <span
          className={styles.trimShadeEnd}
          style={{ width: `${100 - endPercent}%` }}
        />
        <span
          className={styles.trimFrame}
          style={{ left: `${startPercent}%`, right: `${100 - endPercent}%` }}
        />
        {(["start", "end"] as const).map((edge) => (
          <button
            key={edge}
            ref={handles[edge]}
            type="button"
            role="slider"
            data-edge={edge}
            className={`${styles.trimHandle} ${edge === "start" ? styles.handleStart : styles.handleEnd}`}
            style={{ left: `${edge === "start" ? startPercent : endPercent}%` }}
            aria-label={
              edge === "start"
                ? t.inspector.trimStartHandle
                : t.inspector.trimEndHandle
            }
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={Math.round(range[edge])}
            aria-valuetext={formatClock(range[edge])}
            onKeyDown={handleKey(edge)}
          >
            <Icon name="caretRight" size={12} weight="bold" />
          </button>
        ))}
      </div>
      <div className={styles.trimTimes}>
        {timeField("start")}
        <p className={styles.trimLength}>
          {t.inspector.trimLength(formatClock(range.end - range.start))}
        </p>
        {timeField("end")}
      </div>
    </div>
  );
}
