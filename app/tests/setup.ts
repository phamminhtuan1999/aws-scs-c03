import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { clearNotices } from '../src/storage/notices';
import { MemoryBackend, setBackend } from '../src/storage/store';
import { resetClock } from '../src/time/clock';

// jsdom gaps
if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = () => {};
if (!window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  setBackend(new MemoryBackend());
  clearNotices();
  window.location.hash = '';
});
afterEach(() => {
  cleanup();
  resetClock();
});
