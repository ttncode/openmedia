'use client';

import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  "button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])";

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) =>
      element.offsetParent !== null || element === document.activeElement,
  );
}

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    const container = ref.current;
    if (!active || !container) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    (focusableWithin(container)[0] ?? container).focus({ preventScroll: true });
    const trap = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;
      const focusable = focusableWithin(container);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [ref, active]);
}
