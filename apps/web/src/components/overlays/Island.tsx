"use client";

import { useEffect, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Messages } from "@/lib/i18n/en";
import { useStore } from "@/state/StoreProvider";
import type { Notice } from "@/state/types";
import { Icon } from "../controls/Icon";
import styles from "./overlays.module.css";

const VISIBLE_MS = 2800;

function noticeText(notice: Notice, t: Messages): string {
  if (notice.tone === "error") {
    const errors: Record<string, string> = t.errors;
    return errors[notice.message] ?? t.errors.unknown_error;
  }
  switch (notice.message) {
    case "fetched":
      return t.island.fetched;
    case "playlistAdded":
      return t.island.playlistAdded(notice.count ?? 0);
    case "downloaded":
      return t.island.downloaded(notice.detail ?? "");
    case "cancelled":
      return t.island.cancelled;
    case "removedFromQueue":
      return t.island.removedFromQueue;
    case "addedAgain":
      return t.island.addedAgain;
    case "cookiesLoaded":
      return t.island.cookiesLoaded;
    case "cookiesRemoved":
      return t.island.cookiesRemoved;
    case "settingsSaved":
      return t.island.settingsSaved;
    case "pasteFallback":
      return t.importer.pasteFallback;
    case "noLinks":
      return t.importer.noLinks;
    default:
      return notice.message;
  }
}

export function Island(): ReactNode {
  const { t } = useI18n();
  const { state, dispatch } = useStore();
  const notice = state.notice;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "notice/dismissed", id: notice.id }),
      VISIBLE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [notice, dispatch]);

  return (
    <div
      className={styles.island}
      data-open={notice !== null}
      data-tone={notice?.tone ?? "info"}
      role="status"
      aria-live="polite"
    >
      {notice ? (
        <>
          <span className={styles.islandIcon}>
            <Icon
              name={notice.tone === "error" ? "warningCircle" : "check"}
              size={14}
            />
          </span>
          <span className={styles.islandText}>{noticeText(notice, t)}</span>
        </>
      ) : null}
    </div>
  );
}
