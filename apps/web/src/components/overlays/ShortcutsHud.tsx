"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useI18n } from "@/lib/i18n/I18nProvider";
import styles from "./overlays.module.css";

const SHORTCUTS = [
  { keys: ["/"], label: "focus" },
  { keys: ["⌘", "V"], label: "pasteFetch" },
  { keys: ["Esc"], label: "close" },
  { keys: ["?"], label: "show" },
] as const;

export function ShortcutsHud({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const { t } = useI18n();
  const panel = useRef<HTMLElement>(null);
  useFocusTrap(panel, open);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className={styles.layer} data-visible="true">
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />
      <section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className={styles.hud}
      >
        <h2 id="shortcuts-title">{t.shortcuts.title}</h2>
        <dl className={styles.shortcutList}>
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.label}>
              <dt>{t.shortcuts[shortcut.label]}</dt>
              <dd>
                {shortcut.keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <button type="button" className={styles.hudClose} onClick={onClose}>
          {t.shortcuts.dismiss}
        </button>
      </section>
    </div>,
    document.body,
  );
}
