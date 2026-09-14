"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { countItems, visibleItems } from "@/state/reducer";
import { useStore } from "@/state/StoreProvider";
import { Capsule } from "../controls/Capsule";
import { QueueRow } from "./QueueRow";
import styles from "./queue.module.css";

export function QueueView({
  onOpenItem,
  onOpenCookies,
}: {
  onOpenItem: (id: string) => void;
  onOpenCookies: () => void;
}): ReactNode {
  const { t } = useI18n();
  const { state, dispatch, commands } = useStore();
  const items = visibleItems(state);
  const counts = countItems(state);
  const readyCount = state.items.filter((item) => item.type === "ready").length;
  const select = (id: string): void => {
    dispatch({ type: "item/selected", id });
    onOpenItem(id);
  };
  return (
    <section className={styles.view} aria-label={t.queue.listLabel}>
      <div className={styles.viewBar}>
        <p className={styles.summary}>
          {t.queue.summary(counts.all, counts.active, counts.done)}
        </p>
        <div className={styles.viewActions}>
          {state.settings ? (
            <span className={styles.note}>
              {t.queue.concurrency(state.settings.max_concurrent)}
            </span>
          ) : null}
          <Capsule
            variant="tinted"
            disabled={readyCount === 0}
            onClick={() => void commands.startAllReady()}
          >
            {t.queue.startAll(readyCount)}
          </Capsule>
        </div>
      </div>
      {items.length > 0 ? (
        <ul className={styles.list} aria-label={t.queue.listLabel}>
          {items.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              selected={item.id === state.selectedId}
              onSelect={select}
              onOpenCookies={onOpenCookies}
            />
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{t.queue.empty}</p>
      )}
    </section>
  );
}
