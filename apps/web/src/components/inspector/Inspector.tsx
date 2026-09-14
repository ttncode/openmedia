"use client";

import type { ReactNode } from "react";
import { PHONE_QUERY, useMediaQuery } from "@/hooks/useMediaQuery";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { selectedItem } from "@/state/reducer";
import { useStore } from "@/state/StoreProvider";
import { Sheet } from "../overlays/Sheet";
import { InspectorContent } from "./InspectorContent";
import { InspectorFooter } from "./InspectorFooter";
import styles from "./inspector.module.css";

interface InspectorProps {
  sheetOpen: boolean;
  onCloseSheet: () => void;
  onOpenCookies: () => void;
}

export function Inspector({
  sheetOpen,
  onCloseSheet,
  onOpenCookies,
}: InspectorProps): ReactNode {
  const { t } = useI18n();
  const { state } = useStore();
  const isPhone = useMediaQuery(PHONE_QUERY);
  const item = selectedItem(state);
  const footer = item ? (
    <InspectorFooter item={item} onOpenCookies={onOpenCookies} />
  ) : null;
  if (isPhone) {
    return (
      <Sheet
        open={sheetOpen && item !== null}
        onClose={onCloseSheet}
        title={t.inspector.title}
        labelledById="inspector-title"
        footer={footer}
      >
        <InspectorContent item={item} />
      </Sheet>
    );
  }
  return (
    <aside className={styles.inspector} aria-label={t.inspector.title}>
      <div className={styles.scroll}>
        <InspectorContent item={item} />
      </div>
      {footer ? <footer className={styles.foot}>{footer}</footer> : null}
    </aside>
  );
}
