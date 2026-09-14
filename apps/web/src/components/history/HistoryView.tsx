"use client";

import type { ReactNode } from "react";
import { formatBytes } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStore } from "@/state/StoreProvider";
import { Capsule } from "../controls/Capsule";
import { Icon } from "../controls/Icon";
import queueStyles from "../queue/queue.module.css";
import styles from "./history.module.css";

const DATE_TAGS = { vi: "vi-VN", en: "en-US" } as const;

export function HistoryView({
  onClearRequest,
}: {
  onClearRequest: () => void;
}): ReactNode {
  const { t, locale } = useI18n();
  const { state, commands } = useStore();
  const dateFormat = new Intl.DateTimeFormat(DATE_TAGS[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <section className={queueStyles.view} aria-label={t.history.title}>
      <div className={queueStyles.viewBar}>
        <p className={queueStyles.note}>{t.history.note}</p>
        <Capsule
          variant="destructive"
          disabled={state.history.length === 0}
          onClick={onClearRequest}
        >
          {t.history.clear}
        </Capsule>
      </div>
      {state.history.length === 0 ? (
        <p className={queueStyles.empty}>{t.history.empty}</p>
      ) : (
        <ul className={queueStyles.list}>
          {state.history.map((entry) => (
            <li key={entry.id} className={`${queueStyles.row} ${styles.entry}`}>
              <span className={styles.glyph}>
                <Icon
                  name={entry.kind === "audio" ? "musicNotes" : "filmStrip"}
                  size={20}
                />
              </span>
              <span className={queueStyles.rowText}>
                <span className={queueStyles.rowTitle}>{entry.title}</span>
                <span
                  className={queueStyles.rowLine}
                >{`${entry.label}, ${formatBytes(entry.sizeBytes, locale)}, ${dateFormat.format(new Date(entry.finishedAt))}`}</span>
              </span>
              <Capsule
                variant="tinted"
                onClick={() => void commands.downloadAgain(entry.id)}
              >
                {t.history.again}
              </Capsule>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
