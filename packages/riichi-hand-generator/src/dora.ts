import type { MahjongTile } from "riichi-score";
import type { Rng } from "./rng.js";
import type { Skeleton } from "./skeleton.js";

const SUITS = ["m", "p", "s"] as const;

const ALL_TILES: MahjongTile[] = [
  ...SUITS.flatMap((suit) =>
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((rank) => `${rank}${suit}` as MahjongTile),
  ),
  ...(["1z", "2z", "3z", "4z", "5z", "6z", "7z"] as MahjongTile[]),
];

/** An indicator points at the next tile: 9 wraps to 1, winds and dragons cycle. */
export function nextTile(tile: MahjongTile): MahjongTile {
  const rank = Number(tile[0]);
  const suit = tile[1];
  if (suit === "z") {
    return (rank <= 4 ? `${(rank % 4) + 1}z` : `${((rank - 4) % 3) + 5}z`) as MahjongTile;
  }
  return `${(rank % 9) + 1}${suit}` as MahjongTile;
}

const tally = (tiles: readonly MahjongTile[]): Map<MahjongTile, number> => {
  const counts = new Map<MahjongTile, number>();
  for (const tile of tiles) counts.set(tile, (counts.get(tile) ?? 0) + 1);
  return counts;
};

/**
 * Can this shape carry exactly `dora` with `slots` indicators?
 *
 * Reachability is a parity question, not a magnitude one. Every tile in a
 * chiitoitsu hand appears exactly twice, so an indicator contributes 0 or 2 and
 * an odd total is *impossible* — no number of indicators helps. An all-triplet
 * hand has no tile appearing once, so it can never carry exactly 1.
 *
 * Deliberately permissive for standard shapes with runs: overlapping runs can
 * manufacture multiplicities the block structure alone does not show, and a
 * false "impossible" is far worse than a wasted attempt.
 */
export function doraReachable(
  skeleton: Skeleton,
  slots: number,
  dora: number,
): boolean {
  if (dora === 0) return true;
  if (slots === 0) return false;
  if (skeleton.shape === "chiitoitsu") {
    return dora % 2 === 0 && dora <= 2 * slots;
  }
  if (skeleton.shape === "kokushi") {
    // Thirteen singles and one pair.
    return dora <= 2 * slots;
  }

  const hasRuns = skeleton.blocks.some((block) => block.kind === "run");
  // Without runs every tile sits in a triplet, a kan or the pair, so no tile
  // appears exactly once and 1 is unreachable at any number of slots.
  if (!hasRuns && dora === 1) return false;

  // Runs can overlap with each other and with the pair. A 3-run skeleton may
  // carry four copies through two occurrences in its runs plus the pair, so
  // block-local maxima are not a sound upper bound. Four is the physical limit.
  const largest = skeleton.blocks.some((block) => block.kind === "run")
    ? 4
    : Math.max(
        2, // the pair
        ...skeleton.blocks.map((block) =>
          block.kind === "kan" ? 4 : block.kind === "triplet" ? 3 : 0,
        ),
      );
  return dora <= slots * largest;
}

export interface DoraPlacement {
  doraIndicators: MahjongTile[];
  uradoraIndicators: MahjongTile[];
}

/** Every multiset of `slots` values drawn from `values` that sums to `target`. */
function valuePatterns(
  values: number[],
  slots: number,
  target: number,
): number[][] {
  const out: number[][] = [];
  const walk = (index: number, left: number, sum: number, current: number[]): void => {
    if (left === 0) {
      if (sum === target) out.push([...current]);
      return;
    }
    if (sum > target) return;
    for (let i = index; i < values.length; i++) {
      current.push(values[i]);
      walk(i, left - 1, sum + values[i], current);
      current.pop();
    }
  };
  walk(0, slots, 0, []);
  return out;
}

/**
 * Choose indicators so the hand carries exactly `dora` (and `ura`).
 *
 * Indicators are physical tiles competing with the hand for copies — a hand
 * holding two 5z plus a 5z omote, kan-dora and ura indicator would need five.
 * Rare in practice (~0.1 rejected sets per hand) but it is a real illegal hand,
 * so the budget is tracked across the hand and both indicator sets.
 *
 * Patterns are sampled before solutions. A hand typically admits ~50 indicator
 * sets collapsing to ~2 distributions, so first-fit would show a learner the
 * same shape every time — usually both dora sitting in the pair.
 */
export function placeDora(
  handTiles: readonly MahjongTile[],
  slots: number,
  dora: number,
  uraSlots: number,
  ura: number,
  rng: Rng,
): DoraPlacement | null {
  const handCounts = tally(handTiles);
  const budget = new Map(handCounts);

  const pickSet = (
    count: number,
    target: number,
  ): MahjongTile[] | null => {
    if (count === 0) return target === 0 ? [] : null;

    // Bucket candidate indicators by how much dora each would yield.
    const buckets = new Map<number, MahjongTile[]>();
    for (const tile of ALL_TILES) {
      if ((budget.get(tile) ?? 0) >= 4) continue;
      const value = handCounts.get(nextTile(tile)) ?? 0;
      const bucket = buckets.get(value);
      if (bucket) bucket.push(tile);
      else buckets.set(value, [tile]);
    }

    const patterns = valuePatterns(
      [...buckets.keys()].sort((a, b) => a - b),
      count,
      target,
    );
    if (!patterns.length) return null;

    for (const pattern of rng.shuffled(patterns)) {
      const chosen: MahjongTile[] = [];
      const taken = new Map(budget);
      let ok = true;
      for (const value of pattern) {
        const options = (buckets.get(value) ?? []).filter(
          (tile) => (taken.get(tile) ?? 0) < 4,
        );
        if (!options.length) {
          ok = false;
          break;
        }
        const tile = rng.pick(options);
        chosen.push(tile);
        taken.set(tile, (taken.get(tile) ?? 0) + 1);
      }
      if (!ok) continue;
      for (const [tile, n] of taken) budget.set(tile, n);
      return chosen;
    }
    return null;
  };

  const doraIndicators = pickSet(slots, dora);
  if (!doraIndicators) return null;
  const uradoraIndicators = pickSet(uraSlots, ura);
  if (!uradoraIndicators) return null;

  return { doraIndicators, uradoraIndicators };
}
