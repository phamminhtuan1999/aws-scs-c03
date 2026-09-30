/**
 * Versioned localStorage store.
 *
 *  - every key is prefixed "scs-c03-trainer:v1:"
 *  - each slot stores an envelope {version, data} and has one zod schema
 *  - older versions go through the slot's migration chain; unknown/corrupt data is
 *    quarantined under "scs-c03-trainer:v1:corrupt:<timestamp>" and defaults are used (a notice is raised)
 */
import type { ZodType } from 'zod';
import { pushNotice } from './notices';

export const PREFIX = 'scs-c03-trainer:v1:';

export interface Backend {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
  keys(): string[];
}

export class MemoryBackend implements Backend {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  keys() {
    return [...this.m.keys()];
  }
}

function localBackend(): Backend | null {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    const probe = `${PREFIX}__probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      getItem: (k) => ls.getItem(k),
      setItem: (k, v) => ls.setItem(k, v),
      removeItem: (k) => ls.removeItem(k),
      keys: () => Array.from({ length: ls.length }, (_, i) => ls.key(i) as string).filter(Boolean),
    };
  } catch {
    return null;
  }
}

let backend: Backend | null = null;
let memoryFallbackNotified = false;

export function getBackend(): Backend {
  if (!backend) {
    backend = localBackend();
    if (!backend) {
      backend = new MemoryBackend();
      if (!memoryFallbackNotified) {
        memoryFallbackNotified = true;
        pushNotice('storage', 'Browser storage is unavailable; progress will not be kept after this tab is closed.');
      }
    }
  }
  return backend;
}
/** Tests inject a backend (or null to re-detect). */
export function setBackend(b: Backend | null): void {
  backend = b;
  cache.clear();
}

export interface Slot<T> {
  name: string;
  version: number;
  schema: ZodType<T>;
  defaults: () => T;
  /** migrations[v] upgrades data of version v to version v+1 */
  migrations?: Record<number, (data: unknown) => unknown>;
}

const fullKey = (name: string) => PREFIX + name;

// ---- change notification (same-tab writes + cross-tab "storage" events) ----------------------
const listeners = new Map<string, Set<() => void>>();
const anyListeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

export function subscribe(name: string | null, cb: () => void): () => void {
  if (name === null) {
    anyListeners.add(cb);
    return () => anyListeners.delete(cb);
  }
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name)!.add(cb);
  return () => listeners.get(name)?.delete(cb);
}
function notify(name: string) {
  listeners.get(name)?.forEach((l) => l());
  anyListeners.forEach((l) => l());
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === null) {
      cache.clear();
      listeners.forEach((set) => set.forEach((l) => l()));
      anyListeners.forEach((l) => l());
      return;
    }
    if (!e.key.startsWith(PREFIX)) return;
    notify(e.key.slice(PREFIX.length));
  });
}

// ---- read / write -------------------------------------------------------------------------------

function quarantine(name: string, raw: string, why: string): void {
  try {
    const b = getBackend();
    const k = `${PREFIX}corrupt:${Date.now()}`;
    let target = k;
    let n = 1;
    while (b.getItem(target) !== null) target = `${k}.${n++}`;
    b.setItem(target, JSON.stringify({ slot: name, reason: why, raw }));
    b.removeItem(fullKey(name));
  } catch {
    /* quarantine is best-effort */
  }
  pushNotice('corrupt', `Saved data "${name}" could not be read (${why}). It was set aside and defaults are being used.`);
}

/** Migrate + validate a stored envelope. Returns {ok:true,data} or {ok:false,why}. */
export function decodeEnvelope<T>(slot: Slot<T>, raw: string): { ok: true; data: T } | { ok: false; why: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, why: 'not valid JSON' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, why: 'unexpected shape' };
  const env = parsed as { version?: unknown; data?: unknown };
  let version: number;
  let data: unknown;
  if (typeof env.version === 'number' && 'data' in env) {
    version = env.version;
    data = env.data;
  } else {
    // pre-envelope data is treated as version 0
    version = 0;
    data = parsed;
  }
  if (!Number.isInteger(version) || version < 0) return { ok: false, why: 'invalid version' };
  if (version > slot.version) return { ok: false, why: `unknown newer version ${version}` };
  try {
    while (version < slot.version) {
      const step = slot.migrations?.[version];
      if (!step) return { ok: false, why: `no migration from version ${version}` };
      data = step(data);
      version += 1;
    }
  } catch {
    return { ok: false, why: 'migration failed' };
  }
  const r = slot.schema.safeParse(data);
  if (!r.success) return { ok: false, why: 'failed validation' };
  return { ok: true, data: r.data };
}

export function readSlot<T>(slot: Slot<T>): T {
  const b = getBackend();
  let raw: string | null = null;
  try {
    raw = b.getItem(fullKey(slot.name));
  } catch {
    raw = null;
  }
  const c = cache.get(slot.name);
  if (c && c.raw === raw) return c.value as T;
  let value: T;
  if (raw === null) value = slot.defaults();
  else {
    const d = decodeEnvelope(slot, raw);
    if (d.ok) value = d.data;
    else {
      quarantine(slot.name, raw, d.why);
      value = slot.defaults();
      raw = null;
    }
  }
  cache.set(slot.name, { raw, value });
  return value;
}

/** Returns false when the value could not be persisted (quota / disabled storage). */
export function writeSlot<T>(slot: Slot<T>, value: T): boolean {
  const checked = slot.schema.safeParse(value);
  if (!checked.success) throw new Error(`Refusing to store invalid data for "${slot.name}"`);
  const raw = JSON.stringify({ version: slot.version, data: checked.data });
  try {
    getBackend().setItem(fullKey(slot.name), raw);
  } catch {
    pushNotice('storage', 'Could not save progress (browser storage is full or blocked).');
    return false;
  }
  cache.set(slot.name, { raw, value: checked.data });
  notify(slot.name);
  return true;
}

export function removeSlot(name: string): void {
  try {
    getBackend().removeItem(fullKey(name));
  } catch {
    /* ignore */
  }
  cache.delete(name);
  notify(name);
}

export function listSlotNames(prefix: string): string[] {
  try {
    return getBackend()
      .keys()
      .filter((k) => k.startsWith(PREFIX + prefix))
      .map((k) => k.slice(PREFIX.length));
  } catch {
    return [];
  }
}

export function rawSnapshot(name: string): string | null {
  try {
    return getBackend().getItem(fullKey(name));
  } catch {
    return null;
  }
}
