/** Tiny in-memory notice list (e.g. "corrupt data was quarantined") shown as a banner by the UI. */
export interface Notice {
  id: number;
  kind: 'corrupt' | 'storage' | 'info';
  message: string;
}

let notices: Notice[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

export function pushNotice(kind: Notice['kind'], message: string): void {
  notices = [...notices, { id: nextId++, kind, message }];
  // deferred: readSlot() may run during a React render, and listeners set state in other components
  queueMicrotask(() => listeners.forEach((l) => l()));
}
export function dismissNotice(id: number): void {
  notices = notices.filter((n) => n.id !== id);
  listeners.forEach((l) => l());
}
export function getNotices(): Notice[] {
  return notices;
}
export function clearNotices(): void {
  notices = [];
  listeners.forEach((l) => l());
}
export function subscribeNotices(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
