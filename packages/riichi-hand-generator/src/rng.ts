/**
 * Seeded PRNG. Determinism is a contract (same version + spec + seed => same
 * hand), so nothing in this package may call Math.random.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, bound). */
  int(bound: number): number;
  pick<T>(items: readonly T[]): T;
  shuffled<T>(items: readonly T[]): T[];
}

/** mulberry32 — small, fast, and good enough for content generation. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (bound: number): number => Math.floor(next() * bound);

  return {
    next,
    int,
    pick: <T>(items: readonly T[]): T => items[int(items.length)],
    shuffled: <T>(items: readonly T[]): T[] => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}
