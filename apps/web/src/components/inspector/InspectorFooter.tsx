"use client";

import type { ReactNode } from "react";
import { api } from "@/lib/api/client";
import { expiryText } from "@/lib/describe";
import { formatBytes } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { estimateBytes, isTrimmed } from "@/state/options";
import { useStore } from "@/state/StoreProvider";
import type { QueueItem } from "@/state/types";
import { Capsule } from "../controls/Capsule";
import styles from "./inspector.module.css";

export function InspectorFooter({
  item,
  onOpenCookies,
}: {
  item: QueueItem;
  onOpenCookies: () => void;
}): ReactNode {
  const { t, locale } = useI18n();
  const { commands } = useStore();
  if (item.type === "fetching") return null;
  if (item.type === "fetch-error") {
    return (
      <>
        <Capsule
          variant="destructive"
          onClick={() => void commands.removeItem(item.id)}
        >
          {t.queue.remove}
        </Capsule>
        <Capsule
          variant="primary"
          size="large"
          icon="arrowClockwise"
          onClick={() => void commands.retryFetch(item.id)}
        >
          {t.queue.retry}
        </Capsule>
      </>
    );
  }
  if (item.type === "ready") {
    const trimmed = isTrimmed(item.options, item.media.duration);
    const size = estimateBytes(item.options, item.formats, item.media.duration);
    return (
      <>
        <div className={styles.estimate}>
          <span>{trimmed ? t.inspector.selection : t.inspector.estimate}</span>
          <strong>{size === null ? "" : formatBytes(size, locale)}</strong>
        </div>
        <Capsule
          variant="primary"
          size="large"
          icon="download"
          onClick={() => void commands.startDownload(item.id)}
        >
          {trimmed ? t.inspector.downloadSelection : t.inspector.downloadAll}
        </Capsule>
      </>
    );
  }
  const { job } = item;
  if (job.status === "done") {
    return (
      <>
        <div className={styles.estimate}>
          <span>{expiryText(job.expires_at, t, new Date())}</span>
          <strong>{formatBytes(job.files[0]?.size_bytes ?? 0, locale)}</strong>
        </div>
        <div className={styles.footActions}>
          {job.files.slice(1).map((file) => (
            <a
              key={file.index}
              className={styles.secondaryLink}
              href={api.fileUrl(job.job_id, file.index)}
              download={file.name}
            >
              {t.inspector.subtitleFileName(file.name)}
            </a>
          ))}
          <a
            className={styles.primaryLink}
            href={api.fileUrl(job.job_id)}
            download={job.filename ?? undefined}
          >
            {t.inspector.saveToDevice}
          </a>
        </div>
      </>
    );
  }
  if (job.status === "error") {
    return job.error_code === "bot_check" ? (
      <Capsule
        variant="primary"
        size="large"
        icon="cookie"
        onClick={onOpenCookies}
      >
        {t.inspector.addCookies}
      </Capsule>
    ) : (
      <Capsule
        variant="primary"
        size="large"
        icon="arrowClockwise"
        onClick={() => void commands.retryJob(job.job_id)}
      >
        {t.queue.retry}
      </Capsule>
    );
  }
  return (
    <>
      <span className={styles.estimateNote}>{t.inspector.keepsRunning}</span>
      <Capsule
        variant="destructive"
        size="large"
        onClick={() => void commands.cancelJob(job.job_id)}
      >
        {job.status === "queued" ? t.queue.removeQueued : t.queue.remove}
      </Capsule>
    </>
  );
}
