'use client';

import { useSyncExternalStore } from 'react';

export const PHONE_QUERY = '(max-width: 767px)';
export const TABLET_QUERY = '(max-width: 1023px)';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
