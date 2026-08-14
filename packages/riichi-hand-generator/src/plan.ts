import type { Direction, MahjongTile, YakuName } from "riichi-score";
import type { Rng } from "./rng.js";
import type { Block, Skeleton } from "./skeleton.js";
import { templateFor } from "./yaku/templates.js";

const SUITS = ["m", "p", "s"] as const;
export type Suit = (typeof SUITS)[number];

const WIND_TILES: Record<Direction, MahjongTile> = {
  east: "1z",
  south: "2z",
  west: "3z",
  north: "4z",
};
const DRAGONS: MahjongTile[] = ["5z", "6z", "7z"];
const WINDS: MahjongTile[] = ["1z", "2z", "3z", "4z"];
const HONORS: MahjongTile[] = ["1z", "2z", "3z", "4z", ...DRAGONS];

const suited = (rank: number, suit: string): MahjongTile =>
  `${rank}${suit}` as MahjongTile;

/**
 * The tile domain after every required yaku has narrowed it. Accumulating this
 * before placing anything is what makes sequential placement work — the spike
 * measured ~12% acceptance without it and ~61% with.
 */
export interface Domain {
  suits: Suit[];
  minRank: number;
  maxRank: number;
  honorsAllowed: boolean;
  requireHonor: boolean;
  pair: "any" | "yaochu" | "terminal" | "numbered";
  /**
   * Avoid repeating a run unless a duplicate-run yaku was asked for. Worth more
   * than the composition strategy itself: it took the worst measured spec from
   * 31% to 88%.
   */
  avoidDuplicateRuns: boolean;
  /**
   * Keep dragons and the round/seat winds out of triplets. A value triplet is a
   * yaku on its own, so it contaminates any exact spec that did not ask for it —
   * measured at ~70% of the residue once shape-level exclusion was in place.
   */
  forbiddenTriplets: MahjongTile[];
}

export interface TilePlan {
  domain: Domain;
  /** Block index → the exact tiles that block must hold. */
  fixed: Map<number, MahjongTile[]>;
  /** Forced pair tile, when a yaku demands one. */
  pair?: MahjongTile;
}

/** Run starts legal under the domain: the whole run must fit in the range. */
export function runStarts(domain: Domain): number[] {
  const out: number[] = [];
  for (let start = domain.minRank; start + 2 <= domain.maxRank; start++) {
    out.push(start);
  }
  return out;
}

/** Starts allowed for this structural run class. */
export function runStartsFor(block: Block, domain: Domain): number[] {
  const starts = runStarts(domain);
  return block.edge === "terminalRun"
    ? starts.filter((start) => start === 1 || start === 7)
    : starts;
}

function baseDomain(): Domain {
  return {
    suits: [...SUITS],
    minRank: 1,
    maxRank: 9,
    honorsAllowed: true,
    requireHonor: false,
    pair: "any",
    avoidDuplicateRuns: true,
    forbiddenTriplets: [],
  };
}

/**
 * Placers run tightest-first — the ones that pin the most blocks go before the
 * ones that pin fewer, so later placers see a smaller, still-consistent space.
 */
const PLACER_ORDER: Record<string, number> = {
  ryanpeikou: 0,
  ittsuu: 1,
  sanshoku: 2,
  iipeiko: 3,
  yakuhai: 4,
  shousangen: 5,
  daisangen: 5,
  shousuushii: 5,
  daisuushii: 5,
};

export function planTiles(
  skeleton: Skeleton,
  yaku: YakuName[],
  roundWind: Direction,
  seatWind: Direction,
  rng: Rng,
): TilePlan | null {
  const domain = baseDomain();

  // 1. Narrow the domain. Every required yaku contributes before anything is
  //    placed, so no placer can pick a tile another yaku forbids.
  for (const name of yaku) {
    const constraints = templateFor(name)?.domain;
    if (!constraints) continue;
    if (constraints.minRank !== undefined) {
      domain.minRank = Math.max(domain.minRank, constraints.minRank);
    }
    if (constraints.maxRank !== undefined) {
      domain.maxRank = Math.min(domain.maxRank, constraints.maxRank);
    }
    if (constraints.honorsAllowed === false) domain.honorsAllowed = false;
    if (constraints.requireHonor) domain.requireHonor = true;
    if (constraints.pair === "terminal" || constraints.pair === "numbered") {
      domain.pair = constraints.pair;
    }
    else if (constraints.pair === "yaochu" && domain.pair === "any") {
      domain.pair = "yaochu";
    }
    if (constraints.singleSuit) domain.suits = [rng.pick(domain.suits)];
  }
  if (domain.requireHonor && !domain.honorsAllowed) return null;
  if (
    yaku.includes("iipeiko") ||
    yaku.includes("ryanpeikou") ||
    yaku.includes("chanta") ||
    yaku.includes("junchan")
  ) {
    domain.avoidDuplicateRuns = false;
  }

  const YAKUHAI: [string, MahjongTile][] = [
    ["haku", "5z"], ["hatsu", "6z"], ["chun", "7z"],
    ["round-wind", WIND_TILES[roundWind]], ["seat-wind", WIND_TILES[seatWind]],
  ];
  const wantsWindYakuman =
    yaku.includes("shousuushii") || yaku.includes("daisuushii");
  for (const [name, tile] of YAKUHAI) {
    const isWind = name === "round-wind" || name === "seat-wind";
    if (!yaku.includes(name as YakuName) && !(wantsWindYakuman && isWind)) {
      domain.forbiddenTriplets.push(tile);
    }
  }

  const fixed = new Map<number, MahjongTile[]>();
  const runBlocks = skeleton.blocks
    .map((block, index) => (block.kind === "run" ? index : -1))
    .filter((index) => index >= 0);
  const tripletBlocks = skeleton.blocks
    .map((block, index) => (block.kind !== "run" ? index : -1))
    .filter((index) => index >= 0);

  const makeRun = (start: number, suit: string): MahjongTile[] => [
    suited(start, suit),
    suited(start + 1, suit),
    suited(start + 2, suit),
  ];
  const commonRunStarts = (indices: number[]): number[] =>
    indices.length === 0
      ? []
      : runStartsFor(skeleton.blocks[indices[0]], domain).filter((start) =>
      indices.every((index) => runStartsFor(skeleton.blocks[index], domain).includes(start)),
      );
  const placers = yaku
    .filter((name) => templateFor(name)?.placer)
    .sort(
      (a, b) =>
        PLACER_ORDER[templateFor(a)!.placer!] -
        PLACER_ORDER[templateFor(b)!.placer!],
    );

  const freeRuns = [...runBlocks];
  const freeTriplets = [...tripletBlocks];
  let pair: MahjongTile | undefined;

  for (const name of placers) {
    const kind = templateFor(name)!.placer!;

    if (kind === "ittsuu") {
      const indices = freeRuns.slice(0, 3);
      if (
        indices.length < 3 ||
        ![1, 4, 7].every((start, index) =>
          runStartsFor(skeleton.blocks[indices[index]], domain).includes(start),
        )
      ) {
        return null;
      }
      const suit = rng.pick(domain.suits);
      for (const start of [1, 4, 7]) {
        fixed.set(freeRuns.shift()!, makeRun(start, suit));
      }
    } else if (kind === "sanshoku") {
      const starts = commonRunStarts(freeRuns.slice(0, 3));
      if (freeRuns.length < 3 || domain.suits.length < 3 || !starts.length) {
        return null;
      }
      const start = rng.pick(starts);
      for (const suit of SUITS) {
        fixed.set(freeRuns.shift()!, makeRun(start, suit));
      }
    } else if (kind === "ryanpeikou") {
      const starts = commonRunStarts(freeRuns.slice(0, 4));
      if (freeRuns.length < 4 || starts.length < 2) return null;
      const shuffled = rng.shuffled(starts);
      for (const start of shuffled.slice(0, 2)) {
        const suit = rng.pick(domain.suits);
        fixed.set(freeRuns.shift()!, makeRun(start, suit));
        fixed.set(freeRuns.shift()!, makeRun(start, suit));
      }
    } else if (kind === "iipeiko") {
      const starts = commonRunStarts(freeRuns.slice(0, 2));
      if (freeRuns.length < 2 || !starts.length) return null;
      const start = rng.pick(starts);
      const suit = rng.pick(domain.suits);
      fixed.set(freeRuns.shift()!, makeRun(start, suit));
      fixed.set(freeRuns.shift()!, makeRun(start, suit));
    } else if (kind === "yakuhai") {
      if (!freeTriplets.length || !domain.honorsAllowed) return null;
      const tile =
        name === "haku" ? "5z"
        : name === "hatsu" ? "6z"
        : name === "chun" ? "7z"
        : name === "round-wind" ? WIND_TILES[roundWind]
        : WIND_TILES[seatWind];
      const index = freeTriplets.shift()!;
      const size = skeleton.blocks[index].kind === "kan" ? 4 : 3;
      fixed.set(index, Array.from({ length: size }, () => tile as MahjongTile));
    } else if (kind === "shousangen") {
      const dragonTriplets = [...fixed.values()]
        .map((tiles) => tiles[0])
        .filter((tile): tile is MahjongTile => DRAGONS.includes(tile));
      if (dragonTriplets.length > 2) return null;
      const needed = 2 - dragonTriplets.length;
      const selected = rng
        .shuffled(DRAGONS.filter((tile) => !dragonTriplets.includes(tile)))
        .slice(0, needed);
      if (freeTriplets.length < selected.length) return null;
      for (const tile of selected) {
        const index = freeTriplets.shift()!;
        const size = skeleton.blocks[index].kind === "kan" ? 4 : 3;
        fixed.set(index, Array.from({ length: size }, () => tile));
      }
      pair = DRAGONS.find((tile) => ![...dragonTriplets, ...selected].includes(tile));
      if (!pair) return null;
    } else if (kind === "daisangen") {
      if (freeTriplets.length < DRAGONS.length) return null;
      for (const tile of rng.shuffled(DRAGONS)) {
        const index = freeTriplets.shift()!;
        const size = skeleton.blocks[index].kind === "kan" ? 4 : 3;
        fixed.set(index, Array.from({ length: size }, () => tile));
      }
    } else if (kind === "shousuushii") {
      const windTriplets = [...fixed.values()]
        .map((tiles) => tiles[0])
        .filter((tile): tile is MahjongTile => WINDS.includes(tile));
      if (windTriplets.length > 3) return null;
      const selected = rng
        .shuffled(WINDS.filter((tile) => !windTriplets.includes(tile)))
        .slice(0, 3 - windTriplets.length);
      if (freeTriplets.length < selected.length) return null;
      for (const tile of selected) {
        const index = freeTriplets.shift()!;
        const size = skeleton.blocks[index].kind === "kan" ? 4 : 3;
        fixed.set(index, Array.from({ length: size }, () => tile));
      }
      pair = WINDS.find((tile) => ![...windTriplets, ...selected].includes(tile));
      if (!pair) return null;
      // The fourth wind would upgrade this hand to daisuushii.
      domain.forbiddenTriplets.push(...WINDS);
    } else if (kind === "daisuushii") {
      if (freeTriplets.length < WINDS.length) return null;
      for (const tile of rng.shuffled(WINDS)) {
        const index = freeTriplets.shift()!;
        const size = skeleton.blocks[index].kind === "kan" ? 4 : 3;
        fixed.set(index, Array.from({ length: size }, () => tile));
      }
    }
  }

  // 2. `requireHonor` is deliberately NOT placed here. Forcing the honor into a
  //    fixed location makes every hand carry the bare minimum — one honor, in
  //    the same spot. The assigner samples honors per block and rejects a hand
  //    that ends up with none, which satisfies the same rule while leaving the
  //    count free to vary.
  return { domain, fixed, pair };
}
