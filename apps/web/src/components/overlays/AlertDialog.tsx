"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import styles from "./overlays.module.css";

interface AlertDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AlertDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: AlertDialogProps): ReactNode {
  const panel = useRef<HTMLElement>(null);
  useFocusTrap(panel, open);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onCancel]);

  if (!open) return null;
  return createPortal(
    <div className={styles.layer} data-visible="true">
      <div className={styles.scrim} onClick={onCancel} aria-hidden="true" />
      <section
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        aria-describedby="alert-message"
        className={styles.alert}
      >
        <h2 id="alert-title">{title}</h2>
        <p id="alert-message">{message}</p>
        <div className={styles.alertActions}>
          <button type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={destructive ? styles.destructive : styles.confirm}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
