"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { PHONE_QUERY, useMediaQuery } from "@/hooks/useMediaQuery";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Capsule } from "../controls/Capsule";
import styles from "./overlays.module.css";

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.6;
const EXIT_DURATION_MS = 420;

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  labelledById: string;
  children: ReactNode;
  footer?: ReactNode;
}

function useStagedPresence(open: boolean): {
  mounted: boolean;
  visible: boolean;
} {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  if (open && !mounted) setMounted(true);
  if (!open && visible) setVisible(false);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true)),
    );
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => setMounted(false), EXIT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  return { mounted: mounted || open, visible };
}

export function Sheet({
  open,
  onClose,
  title,
  labelledById,
  children,
  footer,
}: SheetProps): ReactNode {
  const { t } = useI18n();
  const isPhone = useMediaQuery(PHONE_QUERY);
  const panel = useRef<HTMLElement>(null);
  const drag = useRef({ startY: 0, lastY: 0, lastTime: 0, velocity: 0 });
  const [offset, setOffset] = useState(0);
  const { mounted, visible } = useStagedPresence(open);
  useFocusTrap(panel, open && mounted);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.dataset.sheetOpen = isPhone ? "true" : "false";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      delete document.body.dataset.sheetOpen;
    };
  }, [open, onClose, isPhone]);

  if (!mounted) return null;

  const beginDrag = (event: PointerEvent<HTMLDivElement>): void => {
    if (!isPhone) return;
    drag.current = {
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: performance.now(),
      velocity: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const now = performance.now();
    drag.current.velocity =
      (event.clientY - drag.current.lastY) /
      Math.max(now - drag.current.lastTime, 1);
    drag.current.lastY = event.clientY;
    drag.current.lastTime = now;
    setOffset(Math.max(0, event.clientY - drag.current.startY));
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const shouldClose =
      offset > DISMISS_DISTANCE || drag.current.velocity > DISMISS_VELOCITY;
    setOffset(0);
    if (shouldClose) onClose();
  };

  return createPortal(
    <div className={styles.layer} data-visible={visible}>
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />
      <section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledById}
        tabIndex={-1}
        className={`${styles.panel} ${isPhone ? styles.sheet : styles.modal}`}
        style={
          offset > 0
            ? { transform: `translateY(${offset}px)`, transition: "none" }
            : undefined
        }
      >
        <div
          className={styles.handleArea}
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className={styles.grabber} aria-hidden="true" />
          <header className={styles.head}>
            <h2 id={labelledById}>{title}</h2>
            <Capsule variant="plain" onClick={onClose}>
              {t.settings.done}
            </Capsule>
          </header>
        </div>
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}
