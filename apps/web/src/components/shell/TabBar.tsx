"use client";

import type { CSSProperties, ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStore } from "@/state/StoreProvider";
import { Icon } from "../controls/Icon";
import styles from "./shell.module.css";

export function TabBar({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}): ReactNode {
  const { t } = useI18n();
  const { state, dispatch } = useStore();
  const index = state.view === "history" ? 1 : 0;
  return (
    <nav
      className={styles.tabbar}
      aria-label={t.nav.downloads}
      style={{ "--tab-index": index } as CSSProperties}
    >
      <span className={styles.tabThumb} aria-hidden="true" />
      <button
        type="button"
        className={styles.tab}
        aria-current={state.view === "queue" ? "page" : undefined}
        onClick={() =>
          dispatch({ type: "view/changed", view: "queue", filter: "all" })
        }
      >
        <Icon name="queue" size={22} />
        <span>{t.nav.queue}</span>
      </button>
      <button
        type="button"
        className={styles.tab}
        aria-current={state.view === "history" ? "page" : undefined}
        onClick={() => dispatch({ type: "view/changed", view: "history" })}
      >
        <Icon name="history" size={22} />
        <span>{t.nav.history}</span>
      </button>
      <button type="button" className={styles.tab} onClick={onOpenSettings}>
        <Icon name="gear" size={22} />
        <span>{t.nav.settings}</span>
      </button>
    </nav>
  );
}
