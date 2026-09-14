"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Icon } from "../controls/Icon";
import styles from "./overlays.module.css";

const TEXT_TYPES = ["text/uri-list", "text/plain"];

function carriesText(event: DragEvent): boolean {
  return [...(event.dataTransfer?.types ?? [])].some((type) =>
    TEXT_TYPES.includes(type),
  );
}

export function DropOverlay({
  onDrop,
}: {
  onDrop: (text: string) => void;
}): ReactNode {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const enter = (event: DragEvent): void => {
      if (!carriesText(event)) return;
      depth.current += 1;
      setVisible(true);
    };
    const leave = (): void => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setVisible(false);
    };
    const over = (event: DragEvent): void => {
      if (carriesText(event)) event.preventDefault();
    };
    const drop = (event: DragEvent): void => {
      depth.current = 0;
      setVisible(false);
      const text =
        event.dataTransfer?.getData("text/uri-list") ||
        event.dataTransfer?.getData("text/plain") ||
        "";
      if (!text) return;
      event.preventDefault();
      onDrop(text);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [onDrop]);

  if (!visible) return null;
  return (
    <div className={styles.dropOverlay}>
      <div className={styles.dropTarget}>
        <Icon name="link" size={40} />
        <p>{t.importer.dropTitle}</p>
      </div>
    </div>
  );
}
