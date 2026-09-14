"use client";

import type { CSSProperties, ReactNode } from "react";
import { remainingText } from "@/lib/describe";
import { formatBytes, formatSpeed } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { jobLabel } from "@/state/reducer";
import { useStore } from "@/state/StoreProvider";
import type { Messages } from "@/lib/i18n/en";
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

type StatusItem = JobItem | FetchErrorItem;

function statusTitle(item: StatusItem, t: Messages): string {
  if (item.type === "fetch-error") return t.inspector.errorTitle;
  const { job } = item;
  switch (job.status) {
    case "downloading":
      return t.inspector.downloadingTitle(jobLabel(job));
    case "queued":
      return t.inspector.queuedTitle(job.queue_position);
    case "processing":
      return t.inspector.processingTitle;
    case "done":
      return t.inspector.doneTitle;
    default:
      return t.inspector.errorTitle;
  }
}

export function StatusCard({ item }: { item: StatusItem }): ReactNode {
  const { t } = useI18n();
  return (
    <>
      <span className="visually-hidden" aria-live="polite">
        {statusTitle(item, t)}
      </span>
      <StatusDetails item={item} />
    </>
  );
}

function StatusDetails({ item }: { item: StatusItem }): ReactNode {
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
          <strong>{statusTitle(item, t)}</strong>
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
      <div className={styles.statusCard}>
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
          <strong>{statusTitle(item, t)}</strong>
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
      body: string;
    }
  > = {
    queued: {
      icon: "timer",
      tone: "",
      body: t.inspector.queuedHelp,
    },
    processing: {
      icon: "arrowClockwise",
      tone: "",
      body: t.inspector.processingHelp,
    },
    done: {
      icon: "checkCircle",
      tone: styles.done,
      body: `${jobLabel(job)}, ${formatBytes(job.files[0]?.size_bytes ?? 0, locale)}`,
    },
    error: {
      icon: "warningCircle",
      tone: styles.error,
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
        <strong>{statusTitle(item, t)}</strong>
        <p>{card.body}</p>
        {job.status === "error" && state.cookies?.present ? (
          <p>{t.inspector.cookiesReady}</p>
        ) : null}
      </div>
    </div>
  );
}
