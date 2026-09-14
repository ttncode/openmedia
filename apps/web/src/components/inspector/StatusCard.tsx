"use client";

import type { CSSProperties, ReactNode } from "react";
import { remainingText } from "@/lib/describe";
import { formatBytes, formatSpeed } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { jobLabel } from "@/state/reducer";
import { useStore } from "@/state/StoreProvider";
import type { FetchErrorItem, JobItem } from "@/state/types";
import { Icon } from "../controls/Icon";
import styles from "./inspector.module.css";

function errorMessage(
  code: string,
  messages: Record<string, string>,
  fallback: string,
): string {
  return messages[code] ?? fallback;
}

export function StatusCard({
  item,
}: {
  item: JobItem | FetchErrorItem;
}): ReactNode {
  const { t, locale } = useI18n();
  const { state } = useStore();
  const errors: Record<string, string> = t.errors;
  if (item.type === "fetch-error") {
    return (
      <div className={styles.statusCard}>
        <span className={`${styles.statusGlyph} ${styles.error}`}>
          <Icon name="warningCircle" size={40} />
        </span>
        <div>
          <strong>{t.inspector.errorTitle}</strong>
          <p>{errorMessage(item.code, errors, t.errors.unknown_error)}</p>
        </div>
      </div>
    );
  }
  const { job } = item;
  if (job.status === "downloading") {
    const style = { "--progress": job.progress } as CSSProperties;
    const detail = [
      job.speed_bps === null ? "" : formatSpeed(job.speed_bps, locale),
      remainingText(job.eta_seconds, t),
    ]
      .filter(Boolean)
      .join(", ");
    return (
      <div className={styles.statusCard} aria-live="polite">
        <span className={styles.bigRing} style={style}>
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
          <span className={styles.bigRingLabel}>
            {Math.floor(job.progress)}%
          </span>
        </span>
        <div>
          <strong>{t.inspector.downloadingTitle(jobLabel(job))}</strong>
          <p>{detail}</p>
        </div>
      </div>
    );
  }
  const cards: Record<
    string,
    {
      icon: "timer" | "arrowClockwise" | "checkCircle" | "warningCircle";
      tone: string;
      title: string;
      body: string;
    }
  > = {
    queued: {
      icon: "timer",
      tone: "",
      title: t.inspector.queuedTitle(job.queue_position),
      body: t.inspector.queuedHelp,
    },
    processing: {
      icon: "arrowClockwise",
      tone: "",
      title: t.inspector.processingTitle,
      body: t.inspector.processingHelp,
    },
    done: {
      icon: "checkCircle",
      tone: styles.done,
      title: t.inspector.doneTitle,
      body: `${jobLabel(job)}, ${formatBytes(job.files[0]?.size_bytes ?? 0, locale)}`,
    },
    error: {
      icon: "warningCircle",
      tone: styles.error,
      title: t.inspector.errorTitle,
      body: errorMessage(
        job.error_code ?? "unknown_error",
        errors,
        job.error ?? t.errors.unknown_error,
      ),
    },
  };
  const card = cards[job.status] ?? cards.error;
  return (
    <div className={styles.statusCard}>
      <span className={`${styles.statusGlyph} ${card.tone}`}>
        <Icon
          name={card.icon}
          size={40}
          weight={job.status === "done" ? "fill" : "regular"}
        />
      </span>
      <div>
        <strong>{card.title}</strong>
        <p>{card.body}</p>
        {job.status === "error" && state.cookies?.present ? (
          <p>{t.inspector.cookiesReady}</p>
        ) : null}
      </div>
    </div>
  );
}
