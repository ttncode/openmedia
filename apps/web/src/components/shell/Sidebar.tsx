"use client";

import type { ReactNode } from "react";
import { formatBytes } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { countItems } from "@/state/reducer";
import { useStore } from "@/state/StoreProvider";
import type { Filter } from "@/state/types";
import { BrandMark } from "../controls/BrandMark";
import { Icon, type IconName } from "../controls/Icon";
import { IconButton } from "../controls/IconButton";
import styles from "./shell.module.css";

const FILTER_ITEMS: ReadonlyArray<{
  filter: Filter;
  icon: IconName;
  label: "queue" | "downloading" | "done" | "attention";
}> = [
  { filter: "all", icon: "queue", label: "queue" },
  { filter: "active", icon: "arrowDown", label: "downloading" },
  { filter: "done", icon: "checkCircle", label: "done" },
  { filter: "error", icon: "warningCircle", label: "attention" },
];

export function Sidebar({
  inert,
  onOpenSettings,
  onNavigate,
}: {
  inert: boolean;
  onOpenSettings: () => void;
  onNavigate: () => void;
}): ReactNode {
  const { t, locale } = useI18n();
  const { state, dispatch } = useStore();
  const counts = countItems(state);
  const go = (
    view: "queue" | "history",
    filter: Filter = state.filter,
  ): void => {
    dispatch({ type: "view/changed", view, filter });
    onNavigate();
  };
  const storage = state.storage;
  const usedPercent = storage
    ? Math.min(
        100,
        (storage.used_bytes /
          (storage.limit_bytes ?? storage.used_bytes + storage.free_bytes)) *
          100,
      )
    : 0;
  return (
    <aside
      className={styles.sidebar}
      aria-label={t.nav.downloads}
      inert={inert}
    >
      <div className={styles.sidebarPanel}>
        <div className={styles.brand}>
          <BrandMark />
          <span className={styles.brandName}>OpenMedia</span>
        </div>
        <nav className={styles.sourceList}>
          <p className={styles.sourceHeading}>{t.nav.downloads}</p>
          {FILTER_ITEMS.map((item) => (
            <button
              key={item.filter}
              type="button"
              className={styles.sourceItem}
              aria-current={
                state.view === "queue" && state.filter === item.filter
              }
              onClick={() => go("queue", item.filter)}
            >
              <Icon name={item.icon} size={17} />
              <span>{t.nav[item.label]}</span>
              <span className={styles.count}>{counts[item.filter] || ""}</span>
            </button>
          ))}
          <p className={styles.sourceHeading}>{t.nav.other}</p>
          <button
            type="button"
            className={styles.sourceItem}
            aria-current={state.view === "history"}
            onClick={() => go("history")}
          >
            <Icon name="history" size={17} />
            <span>{t.nav.history}</span>
            <span className={styles.count}>{state.history.length || ""}</span>
          </button>
          <button
            type="button"
            className={styles.sourceItem}
            onClick={onOpenSettings}
          >
            <Icon name="gear" size={17} />
            <span>{t.nav.settings}</span>
            <span />
          </button>
        </nav>
        <div className={styles.sidebarFoot}>
          {state.preferences.installHintDismissed ? null : (
            <div className={styles.installCard}>
              <Icon name="deviceMobile" size={16} />
              <p>{t.importer.installHint}</p>
              <IconButton
                label={t.importer.dismissInstallHint}
                icon="x"
                size="small"
                onClick={() =>
                  dispatch({
                    type: "preferences/changed",
                    patch: { installHintDismissed: true },
                  })
                }
              />
            </div>
          )}
          {storage ? (
            <div className={styles.storage}>
              <div className={styles.storageLine}>
                <span>{t.settings.storage}</span>
                <span>{formatBytes(storage.used_bytes, locale)}</span>
              </div>
              <span className={styles.storageBar} aria-hidden="true">
                <span style={{ width: `${usedPercent}%` }} />
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
