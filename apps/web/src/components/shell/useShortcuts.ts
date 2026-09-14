'use client';

import { useEffect, type RefObject } from 'react';

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest("input, textarea, select, [contenteditable='true']") !== null
  );
}

export function useShortcuts({
  inputRef,
  onShortcuts,
  overlayOpen,
}: {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onShortcuts: () => void;
  overlayOpen: boolean;
}): void {
  useEffect(() => {
    const handle = (event: KeyboardEvent): void => {
      if (
        overlayOpen ||
        isTyping(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if (event.key === '/') {
        event.preventDefault();
        inputRef.current?.focus();
      } else if (event.key === '?') {
        event.preventDefault();
        onShortcuts();
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [inputRef, onShortcuts, overlayOpen]);
}
