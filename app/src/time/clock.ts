/** Clock abstraction so tests can inject a fake clock. Real clock uses Date.now() (works with Playwright's page.clock). */
export interface Clock {
  now(): number;
}

export const realClock: Clock = { now: () => Date.now() };

export class FakeClock implements Clock {
  constructor(private t = 0) {}
  now(): number {
    return this.t;
  }
  set(t: number): void {
    this.t = t;
  }
  advance(ms: number): void {
    this.t += ms;
  }
}

let current: Clock = realClock;
export function getClock(): Clock {
  return current;
}
export function setClock(c: Clock): void {
  current = c;
}
export function resetClock(): void {
  current = realClock;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}`;
}
