"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { api } from "@/lib/api/client";
import { rowLine } from "@/lib/describe";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStore } from "@/state/StoreProvider";
import type { QueueItem } from "@/state/types";
import { Capsule } from "../controls/Capsule";
import { Icon, type IconName } from "../controls/Icon";
import { ProgressRing } from "./ProgressRing";
import { Thumbnail } from "./Thumbnail";
import styles from "./queue.module.css";

const PLATFORM_ICONS: Record<string, IconName> = {
  youtube: "youtube",
  tiktok: "tiktok",
  instagram: "instagram",
  soundcloud: "soundcloud",
  x: "xLogo",
  facebook: "facebook",
  vimeo: "vimeo",
  other: "globe",
};

interface QueueRowProps {
  item: QueueItem;
  selected: boolean;
  onSelect: (id: string) => void;
  onOpenCookies: () => void;
}

function Trailing({
  item,
  onOpenCookies,
}: {
  item: QueueItem;
  onOpenCookies: () => void;
}): ReactNode {
  const { t } = useI18n();
  const { commands } = useStore();
  if (item.type === "fetching") return null;
  if (item.type === "fetch-error")
    return (
      <Capsule
        variant="tinted"
        onClick={() => void commands.retryFetch(item.id)}
      >
        {t.queue.retry}
      </Capsule>
    );
  if (item.type === "ready")
    return (
      <Capsule
        variant="tinted"
        onClick={() => void commands.startDownload(item.id)}
      >
        {t.queue.download}
      </Capsule>
    );
  const { job } = item;
  if (job.status === "done") {
    return (
      <>
        <span className={styles.doneGlyph}>
          <Icon name="checkCircle" size={20} weight="fill" />
        </span>
        <a
          className={styles.saveLink}
          href={api.fileUrl(job.job_id)}
          download={job.filename ?? undefined}
        >
          {t.queue.save}
        </a>
      </>
    );
  }
  if (job.status === "error") {
    return job.error_code === "bot_check" ? (
      <Capsule variant="tinted" onClick={onOpenCookies}>
        {t.queue.fix}
      </Capsule>
    ) : (
      <Capsule
        variant="tinted"
        onClick={() => void commands.retryJob(job.job_id)}
      >
        {t.queue.retry}
      </Capsule>
    );
  }
  const waiting = job.status === "queued";
  return (
    <button
      type="button"
      className={styles.ringButton}
      aria-label={
        waiting ? t.queue.removeQueued : t.queue.cancel(item.media.title)
      }
      onClick={() => void commands.cancelJob(job.job_id)}
    >
      <ProgressRing progress={job.progress} waiting={waiting} />
    </button>
  );
}

export function QueueRow({
  item,
  selected,
  onSelect,
  onOpenCookies,
}: QueueRowProps): ReactNode {
  const { t, locale } = useI18n();
  if (item.type === "fetching") {
    return (
      <li className={`${styles.row} ${styles.arriving}`} aria-busy="true">
        <span className={`${styles.thumb} ${styles.skeleton}`} />
        <span className={styles.rowText}>
          <span className={styles.skeletonLine} />
          <span className={`${styles.skeletonLine} ${styles.short}`} />
        </span>
      </li>
    );
  }
  const line = rowLine(item, t, locale);
  const title = item.type === "fetch-error" ? item.url : item.media.title;
  const platform = item.type === "fetch-error" ? "other" : item.media.platform;
  const select = (): void => onSelect(item.id);
  const handleKey = (event: KeyboardEvent<HTMLLIElement>): void => {
    if (
      event.target === event.currentTarget &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      select();
    }
  };
  return (
    <li
      className={`${styles.row} ${styles.arriving}`}
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={select}
      onKeyDown={handleKey}
    >
      {item.type === "fetch-error" ? (
        <span className={`${styles.thumb} ${styles.errorThumb}`}>
          <Icon name="warningCircle" size={20} />
        </span>
      ) : (
        <Thumbnail
          src={item.media.thumbnail}
          kind={item.options.kind}
          alt=""
          variant="row"
        />
      )}
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        <span
          className={`${styles.rowLine} ${line.tone === "error" ? styles.errorLine : ""}`}
        >
          <Icon
            name={
              line.tone === "error" ? "warningCircle" : PLATFORM_ICONS[platform]
            }
            size={13}
          />
          <span>{line.text}</span>
        </span>
      </span>
      <span
        className={styles.rowTrailing}
        role="presentation"
        onClick={(event) => event.stopPropagation()}
      >
        <Trailing item={item} onOpenCookies={onOpenCookies} />
      </span>
    </li>
  );
}
