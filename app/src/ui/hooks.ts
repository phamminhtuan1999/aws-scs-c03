import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { AppData } from '../data/loader';
import { readSlot, subscribe, type Slot } from '../storage/store';
import { subscribeNotices, getNotices } from '../storage/notices';
import { getClock } from '../time/clock';

export const DataContext = createContext<AppData | null>(null);

export function useData(): AppData {
  const d = useContext(DataContext);
  if (!d) throw new Error('DataContext missing');
  return d;
}

/** Subscribe to a persisted slot (same-tab writes and cross-tab "storage" events). */
export function useSlot<T>(slot: Slot<T>): T {
  const sub = useCallback((cb: () => void) => subscribe(slot.name, cb), [slot.name]);
  return useSyncExternalStore(sub, () => readSlot(slot), () => slot.defaults());
}

export function useNotices() {
  return useSyncExternalStore(subscribeNotices, getNotices, getNotices);
}

/**
 * Current time from the injectable clock. Re-evaluates on an interval and whenever the tab becomes
 * visible again, so a background/throttled tab can never show a stale time.
 */
export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => getClock().now());
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(getClock().now());
    tick();
    const id = window.setInterval(tick, intervalMs);
    const vis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('focus', tick);
    };
  }, [intervalMs, enabled]);
  return now;
}
