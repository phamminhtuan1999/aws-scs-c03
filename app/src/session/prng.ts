/** Seeded PRNG (mulberry32) + helpers. Deterministic across runs and platforms. */

/** FNV-1a 32-bit hash of a string -> uint32 seed. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(a: number): () => number {
  let s = a >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFromSeed(seed: string): () => number {
  return mulberry32(hashSeed(seed));
}

/** Fisher-Yates shuffle returning a new array; same seed + same input -> same output. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const a = [...items];
  const rnd = rngFromSeed(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Draw N ids: seeded shuffle of the eligible ids, take the first N, keep the shuffled order. */
export function drawQuestionIds(eligible: readonly string[], n: number, seed: string): string[] {
  const sorted = [...eligible].sort(); // input order must never influence the draw
  return seededShuffle(sorted, seed).slice(0, Math.max(0, Math.min(n, sorted.length)));
}

export function randomSeed(): string {
  const b = new Uint32Array(1);
  globalThis.crypto.getRandomValues(b);
  return b[0].toString(36).slice(0, 6).padStart(6, '0');
}
