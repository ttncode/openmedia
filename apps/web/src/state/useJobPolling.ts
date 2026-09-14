'use client';

import { useEffect } from 'react';

const ACTIVE_INTERVAL_MS = 1000;
const IDLE_INTERVAL_MS = 10000;

export function useJobPolling(
  sync: () => Promise<void>,
  hasActiveJobs: boolean,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return;
    const interval = hasActiveJobs ? ACTIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
    const tick = (): void => {
      if (document.visibilityState === 'visible') void sync();
    };
    const timer = window.setInterval(tick, interval);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [sync, hasActiveJobs, enabled]);
}
