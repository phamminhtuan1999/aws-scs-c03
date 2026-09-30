import { useSyncExternalStore } from 'react';

/** Minimal hash router: "#/exam/run?x=1" -> path "/exam/run", query {x:"1"}. */
export interface Route {
  path: string;
  segments: string[];
  query: URLSearchParams;
}

function currentHash(): string {
  return typeof window === 'undefined' ? '' : window.location.hash;
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const [p, q = ''] = raw.split('?');
  const path = '/' + p.split('/').filter(Boolean).map(decodeURIComponentSafe).join('/');
  return { path, segments: path.split('/').filter(Boolean), query: new URLSearchParams(q) };
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, currentHash, () => '');
  return parseHash(hash);
}

export function navigate(path: string, opts: { replace?: boolean } = {}): void {
  const target = '#' + (path.startsWith('/') ? path : '/' + path);
  if (opts.replace) window.location.replace(target);
  else window.location.hash = target;
}

export const href = (path: string) => '#' + (path.startsWith('/') ? path : '/' + path);
