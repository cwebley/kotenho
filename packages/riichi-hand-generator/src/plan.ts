import type { Direction, MahjongTile, YakuName } from "riichi-score";
import type { Rng } from "./rng.js";
import type { Skeleton } from "./skeleton.js";
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
  /**
   * Avoid repeating a run unless a duplicate-run yaku was asked for. Worth more
   * than the composition strategy itself: it took the worst measured spec from
   * 31% to 88%.
   */
  avoidDuplicateRuns: boolean;
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

function baseDomain(): Domain {
  return {
    suits: [...SUITS],
    minRank: 1,
    maxRank: 9,
    honorsAllowed: true,
    requireHonor: false,
    avoidDuplicateRuns: true,
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
    if (constraints.singleSuit) domain.suits = [rng.pick(domain.suits)];
  }
  if (domain.requireHonor && !domain.honorsAllowed) return null;
  if (yaku.includes("iipeiko") || yaku.includes("ryanpeikou")) {
    domain.avoidDuplicateRuns = false;
  }

  const starts = runStarts(domain);
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

  const placers = yaku
    .filter((name) => templateFor(name)?.placer)
    .sort(
      (a, b) =>
        PLACER_ORDER[templateFor(a)!.placer!] -
        PLACER_ORDER[templateFor(b)!.placer!],
    );

  let freeRuns = [...runBlocks];
  let freeTriplets = [...tripletBlocks];

  for (const name of placers) {
    const kind = templateFor(name)!.placer!;

    if (kind === "ittsuu") {
      if (freeRuns.length < 3 || ![1, 4, 7].every((s) => starts.includes(s))) {
        return null;
      }
      const suit = rng.pick(domain.suits);
      for (const start of [1, 4, 7]) {
        fixed.set(freeRuns.shift()!, makeRun(start, suit));
      }
    } else if (kind === "sanshoku") {
      if (freeRuns.length < 3 || domain.suits.length < 3 || !starts.length) {
        return null;
      }
      const start = rng.pick(starts);
      for (const suit of SUITS) {
        fixed.set(freeRuns.shift()!, makeRun(start, suit));
      }
    } else if (kind === "ryanpeikou") {
      if (freeRuns.length < 4 || starts.length < 2) return null;
      const shuffled = rng.shuffled(starts);
      for (const start of shuffled.slice(0, 2)) {
        const suit = rng.pick(domain.suits);
        fixed.set(freeRuns.shift()!, makeRun(start, suit));
        fixed.set(freeRuns.shift()!, makeRun(start, suit));
      }
    } else if (kind === "iipeiko") {
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
    }
  }

  // 2. honitsu needs at least one honor somewhere. The pair is the cheapest
  //    place to put it when its class allows.
  let pair: MahjongTile | undefined;
  if (domain.requireHonor && ![...fixed.values()].some((t) => t[0].endsWith("z"))) {
    const round = WIND_TILES[roundWind];
    const seat = WIND_TILES[seatWind];
    if (skeleton.pair === "plain") {
      const plain = (["1z", "2z", "3z", "4z"] as MahjongTile[]).filter(
        (t) => t !== round && t !== seat,
      );
      if (!plain.length) return null;
      pair = rng.pick(plain);
    } else if (skeleton.pair === "yakuhai") {
      pair = rng.pick([...DRAGONS, round, seat].filter((t, i, a) => a.indexOf(t) === i));
    } else {
      pair = round;
    }
  }

  return { domain, fixed, pair };
}
