import type {
  Direction,
  HandInput,
  MahjongTile,
  Meld,
  WaitType,
} from "riichi-score";
import { createRuleset } from "riichi-score";
import type { Domain, TilePlan } from "./plan.js";
import { runStartsFor } from "./plan.js";
import type { Rng } from "./rng.js";
import type { Block, PairClass, Skeleton } from "./skeleton.js";

/**
 * The reading the planner built. It is aiming information, never an answer —
 * kotenho may well select a different reading, and that is fine. Its only job
 * is to let the verifier tell "a better reading won" apart from "our fu table
 * is wrong".
 */
export interface IntendedReading {
  shape: "standard" | "chiitoitsu" | "kokushi";
  groups: string[];
  pair: MahjongTile;
  wait: WaitType;
}

export interface Assignment {
  handInput: HandInput;
  intended: IntendedReading;
}

const SUITS = ["m", "p", "s"] as const;
const DIRECTIONS: Direction[] = ["east", "south", "west", "north"];
const WIND_TILES: Record<Direction, MahjongTile> = {
  east: "1z",
  south: "2z",
  west: "3z",
  north: "4z",
};
const DRAGONS: MahjongTile[] = ["5z", "6z", "7z"];
const HONORS: MahjongTile[] = ["1z", "2z", "3z", "4z", "5z", "6z", "7z"];
const GREEN_TILES = new Set<MahjongTile>(["2s", "3s", "4s", "6s", "8s", "6z"]);

const suited = (rank: number, suit: string): MahjongTile =>
  `${rank}${suit}` as MahjongTile;
const isHonor = (tile: MahjongTile): boolean => tile.endsWith("z");

/** Keep returned tile arrays readable without depending on scorer build output. */
const sortTiles = (tiles: readonly MahjongTile[]): MahjongTile[] => {
  const suits = { m: 0, p: 1, s: 2, z: 3 } as const;
  return [...tiles].sort((a, b) => {
    const suitDiff = suits[a[1] as keyof typeof suits] - suits[b[1] as keyof typeof suits];
    if (suitDiff) return suitDiff;
    const rawA = Number(a[0]);
    const rawB = Number(b[0]);
    const rankDiff = (rawA || 5) - (rawB || 5);
    return rankDiff || rawA - rawB;
  });
};

export const groupSignature = (tiles: readonly string[]): string =>
  [...tiles]
    .map((tile) => (tile[0] === "0" ? `5${tile[1]}` : tile))
    .sort()
    .join("");

export function readingSignature(reading: IntendedReading): string {
  if (reading.shape !== "standard") return reading.shape;
  const pair = reading.pair[0] === "0" ? `5${reading.pair[1]}` : reading.pair;
  return `${[...reading.groups].sort().join("|")}/${pair}/${reading.wait}`;
}

const ORPHANS: MahjongTile[] = [
  "1m", "9m", "1p", "9p", "1s", "9s",
  "1z", "2z", "3z", "4z", "5z", "6z", "7z",
];
const CHUUREN_BASE = [1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9];

/** Thirteen orphans plus a duplicate. Winning on the duplicate is the 13-wait. */
function assignKokushi(
  skeleton: Skeleton,
  roundWind: Direction,
  seatWind: Direction,
  rng: Rng,
): Assignment {
  const duplicate = rng.pick(ORPHANS);
  const thirteenWait = rng.next() < 0.5;
  const winningTile = thirteenWait
    ? duplicate
    : rng.pick(ORPHANS.filter((tile) => tile !== duplicate));

  const closedTiles = [...ORPHANS, duplicate];
  closedTiles.splice(closedTiles.indexOf(winningTile), 1);

  return {
    handInput: {
      closedTiles: sortTiles(closedTiles),
      openMelds: [],
      winningTile: skeleton.tsumo
        ? { tile: winningTile, isTsumo: true }
        : {
            tile: winningTile,
            from: rng.pick(DIRECTIONS.filter((d) => d !== seatWind)),
          },
      gameState: {
        roundWind,
        seatWind,
        doraIndicators: [],
        uradoraIndicators: [],
        isRiichi: false,
        honbaCount: 0,
        ruleset: createRuleset(),
      },
    },
    intended: {
      shape: "kokushi",
      groups: [],
      pair: duplicate,
      wait: "tanki",
    },
  };
}

const ALL_TILES: MahjongTile[] = [
  ...SUITS.flatMap((suit) =>
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((rank) => suited(rank, suit)),
  ),
  ...HONORS,
];

/** Tiles a triplet or kan may use, given its edge class and the domain. */
function tripletOptions(block: Block, domain: Domain): MahjongTile[] {
  const numbered = domain.honorsOnly ? [] : domain.suits.flatMap((suit) => {
    const out: MahjongTile[] = [];
    for (let rank = domain.minRank; rank <= domain.maxRank; rank++) {
      const terminal = rank === 1 || rank === 9;
      const wantsTerminalOrHonor = block.edge === "terminalOrHonor";
      if (wantsTerminalOrHonor !== terminal) continue;
      out.push(suited(rank, suit));
    }
    return out;
  });
  if (block.edge === "simple") {
    return domain.greenOnly ? numbered.filter((tile) => GREEN_TILES.has(tile)) : numbered;
  }
  const honors = domain.honorsAllowed
    ? HONORS.filter((tile) => !domain.forbiddenTriplets.includes(tile))
    : [];
  const options = [...numbered, ...honors];
  return domain.greenOnly ? options.filter((tile) => GREEN_TILES.has(tile)) : options;
}

/**
 * Pick a tile when both honors and numbers are legal for the same slot.
 *
 * Sampling the option list uniformly makes the honor/number split an accident
 * of how many tile *types* each class happens to contribute: a chanta triplet
 * offers six terminals against two or three legal honors, so honors landed
 * about a quarter of the time and hands came out honor-poor. Choosing the class
 * first and the tile second removes that weighting, and it is the only control
 * over how many honor groups a hand carries — no target, no quota.
 */
function pickTile(options: MahjongTile[], rng: Rng): MahjongTile {
  const honors = options.filter(isHonor);
  if (!honors.length || honors.length === options.length) return rng.pick(options);
  const numbers = options.filter((tile) => !isHonor(tile));
  return rng.pick(rng.next() < 0.5 ? honors : numbers);
}

function pairOptions(
  pairClass: PairClass,
  domain: Domain,
  roundWind: Direction,
  seatWind: Direction,
): MahjongTile[] {
  const round = WIND_TILES[roundWind];
  const seat = WIND_TILES[seatWind];
  const restrict = (tiles: MahjongTile[]): MahjongTile[] =>
    tiles.filter((tile) => {
      if (domain.forbiddenPairs.includes(tile)) return false;
      if (domain.pair === "any") return true;
      if (domain.pair === "numbered") return !tile.endsWith("z");
      if (tile.endsWith("z")) return domain.pair === "yaochu";
      const rank = Number(tile[0]);
      return rank === 1 || rank === 9;
    });
  if (pairClass === "doubleWind") {
    return restrict(round === seat ? [round] : []);
  }
  if (pairClass === "yakuhai") {
    if (!domain.honorsAllowed) return [];
    const value = round === seat ? DRAGONS : [...DRAGONS, round, seat];
    return restrict([...new Set(value)]);
  }
  const excluded = new Set<MahjongTile>([...DRAGONS, round, seat]);
  const numbered = domain.suits.flatMap((suit) => {
    const out: MahjongTile[] = [];
    for (let rank = domain.minRank; rank <= domain.maxRank; rank++) {
      out.push(suited(rank, suit));
    }
    return out;
  });
  const honors = domain.honorsAllowed
    ? HONORS.filter((tile) => !excluded.has(tile))
    : [];
  const options = restrict([...numbered, ...honors]);
  return domain.greenOnly ? options.filter((tile) => GREEN_TILES.has(tile)) : options;
}

/** Where the winning tile sits in a run, given the wait. */
export function winFromRun(
  tiles: MahjongTile[],
  wait: WaitType,
  rng: Rng,
): MahjongTile | null {
  const start = Number(tiles[0][0]);
  if (wait === "kanchan") return tiles[1];
  if (wait === "penchan") {
    if (start === 1) return tiles[2];
    if (start === 7) return tiles[0];
    return null;
  }
  // ryanmen: winning on an end must leave a genuine two-sided wait
  const options: MahjongTile[] = [];
  if (start + 3 <= 9) options.push(tiles[0]);
  if (start - 1 >= 1) options.push(tiles[2]);
  return options.length ? rng.pick(options) : null;
}

function meldTypeFor(block: Block): Meld["type"] {
  if (block.kind === "kan") return block.called ? "daiminkan" : "ankan";
  if (block.kind === "run") return "run";
  return "set";
}

function assignChiitoitsu(
  skeleton: Skeleton,
  domain: Domain,
  roundWind: Direction,
  seatWind: Direction,
  rng: Rng,
  kansaiChiitoitsu: boolean,
): Assignment | null {
  const pool = ALL_TILES.filter((tile) => {
    if (isHonor(tile)) return domain.honorsAllowed;
    if (domain.honorsOnly) return false;
    if (!domain.suits.includes(tile[1] as (typeof SUITS)[number])) return false;
    const rank = Number(tile[0]);
    return rank >= domain.minRank && rank <= domain.maxRank;
  });
  const quadCounts = (kansaiChiitoitsu ? [0, 1, 2, 3] : [0]).filter(
    (quads) => pool.length >= 7 - quads,
  );
  if (!quadCounts.length) return null;

  const quads = rng.pick(quadCounts);
  const pairs = rng.shuffled(pool).slice(0, 7 - quads);
  if (domain.requireHonor && !pairs.some(isHonor)) return null;

  const winningTile = rng.pick(pairs);
  const closedTiles: MahjongTile[] = [];
  for (let index = 0; index < pairs.length; index++) {
    const copies = index < quads ? 4 : 2;
    closedTiles.push(...Array.from({ length: copies }, () => pairs[index]));
  }
  closedTiles.splice(closedTiles.indexOf(winningTile), 1);

  return {
    handInput: {
      closedTiles: sortTiles(closedTiles),
      openMelds: [],
      winningTile: skeleton.tsumo
        ? { tile: winningTile, isTsumo: true }
        : {
            tile: winningTile,
            from: rng.pick(DIRECTIONS.filter((d) => d !== seatWind)),
          },
      gameState: {
        roundWind,
        seatWind,
        doraIndicators: [],
        uradoraIndicators: [],
        isRiichi: false,
        honbaCount: 0,
        ruleset: createRuleset(),
      },
    },
    intended: {
      shape: "chiitoitsu",
      groups: [],
      pair: winningTile,
      wait: "tanki",
    },
  };
}

/** Nine gates is a tile multiset, not a prescribed grouping. */
function assignChuuren(
  skeleton: Skeleton,
  domain: Domain,
  roundWind: Direction,
  seatWind: Direction,
  rng: Rng,
): Assignment {
  const suit = rng.pick(domain.suits);
  const winningTile = suited(rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9]), suit);
  const closedTiles = CHUUREN_BASE.map((rank) => suited(rank, suit));

  return {
    handInput: {
      closedTiles: sortTiles(closedTiles),
      openMelds: [],
      winningTile: skeleton.tsumo
        ? { tile: winningTile, isTsumo: true }
        : {
            tile: winningTile,
            from: rng.pick(DIRECTIONS.filter((direction) => direction !== seatWind)),
          },
      gameState: {
        roundWind,
        seatWind,
        doraIndicators: [],
        uradoraIndicators: [],
        isRiichi: false,
        honbaCount: 0,
        ruleset: createRuleset(),
      },
    },
    // The scorer owns chuuren's many valid decompositions. The intended reading
    // is diagnostic-only and does not constrain verification for this yakuman.
    intended: {
      shape: "standard",
      groups: [],
      pair: suited(1, suit),
      wait: "tanki",
    },
  };
}

function tryAssign(
  skeleton: Skeleton,
  plan: TilePlan,
  roundWind: Direction,
  seatWind: Direction,
  rng: Rng,
  kansaiChiitoitsu: boolean,
): Assignment | null {
  const { domain } = plan;
  if (skeleton.shape === "kokushi") {
    return assignKokushi(skeleton, roundWind, seatWind, rng);
  }
  if (skeleton.shape === "chiitoitsu") {
    return assignChiitoitsu(
      skeleton,
      domain,
      roundWind,
      seatWind,
      rng,
      kansaiChiitoitsu,
    );
  }
  if (plan.chuuren) {
    return assignChuuren(skeleton, domain, roundWind, seatWind, rng);
  }

  const counts = new Map<MahjongTile, number>();
  const take = (tiles: MahjongTile[]): boolean => {
    for (const tile of tiles) {
      const next = (counts.get(tile) ?? 0) + 1;
      if (next > 4) return false;
      counts.set(tile, next);
    }
    return true;
  };

  const usedRuns = new Set<string>();
  const concrete: { block: Block; tiles: MahjongTile[] }[] = [];

  for (let i = 0; i < skeleton.blocks.length; i++) {
    const block = skeleton.blocks[i];
    const preset = plan.fixed.get(i);

    if (preset) {
      if (!take(preset)) return null;
      if (block.kind === "run") usedRuns.add(groupSignature(preset));
      concrete.push({ block, tiles: [...preset] });
      continue;
    }

    if (block.kind === "run") {
      const starts = runStartsFor(block, domain);
      if (!starts.length) return null;
      // Duplicate-run avoidance is the single highest-value bias measured:
      // it moved the worst compound spec from 31% to 88% acceptance.
      let tiles: MahjongTile[] | null = null;
      for (let attempt = 0; attempt < 20; attempt++) {
        const start = rng.pick(starts);
        const suit = rng.pick(domain.suits);
        const run = [0, 1, 2].map((offset) => suited(start + offset, suit));
        if (domain.avoidDuplicateRuns && usedRuns.has(groupSignature(run))) {
          continue;
        }
        tiles = run;
        break;
      }
      if (!tiles) return null;
      if (!take(tiles)) return null;
      usedRuns.add(groupSignature(tiles));
      concrete.push({ block, tiles });
      continue;
    }

    const options = tripletOptions(block, domain);
    if (!options.length) return null;
    const tile = pickTile(options, rng);
    const size = block.kind === "kan" ? 4 : 3;
    const tiles = Array.from({ length: size }, () => tile);
    if (!take(tiles)) return null;
    concrete.push({ block, tiles });
  }

  const pairChoices = pairOptions(skeleton.pair, domain, roundWind, seatWind);
  const pairTile =
    plan.pair ??
    // A yaochu pair has the same terminal-vs-honor split as a yaochu triplet.
    (domain.pair === "yaochu" ? pickTile(pairChoices, rng) : rng.pick(pairChoices));
  if (!pairTile) return null;
  if (!take([pairTile, pairTile])) return null;
  if (domain.requireHonor && ![...counts.keys()].some(isHonor)) return null;

  // The winning tile comes from whichever block hosts the wait — which may
  // have been fixed by a placer, so it can fail to support the wait at all.
  let winningTile: MahjongTile | null = null;
  if (skeleton.waitHost === -1) {
    winningTile = pairTile;
  } else {
    const host = concrete[skeleton.waitHost];
    winningTile =
      host.block.kind === "run"
        ? winFromRun(host.tiles, skeleton.wait, rng)
        : host.tiles[0];
  }
  if (!winningTile) return null;

  const openMelds: Meld[] = [];
  const closedTiles: MahjongTile[] = [];
  for (const { block, tiles } of concrete) {
    if (block.called || block.kind === "kan") {
      openMelds.push({
        type: meldTypeFor(block),
          tiles: sortTiles(tiles),
        from: block.called
          ? rng.pick(DIRECTIONS.filter((d) => d !== seatWind))
          : seatWind,
      });
    } else {
      closedTiles.push(...tiles);
    }
  }
  closedTiles.push(pairTile, pairTile);

  const winnerIndex = closedTiles.indexOf(winningTile);
  if (winnerIndex === -1) return null;
  closedTiles.splice(winnerIndex, 1);

  return {
    handInput: {
      closedTiles: sortTiles(closedTiles),
      openMelds,
      winningTile: skeleton.tsumo
        ? { tile: winningTile, isTsumo: true }
        : {
            tile: winningTile,
            from: rng.pick(DIRECTIONS.filter((d) => d !== seatWind)),
          },
      gameState: {
        roundWind,
        seatWind,
        doraIndicators: [],
        uradoraIndicators: [],
        isRiichi: false,
        honbaCount: 0,
        ruleset: createRuleset(),
      },
    },
    intended: {
      shape: "standard",
      groups: concrete.map(({ tiles }) => groupSignature(tiles)),
      pair: pairTile,
      wait: skeleton.wait,
    },
  };
}

export function assignTiles(
  skeleton: Skeleton,
  plan: TilePlan,
  roundWind: Direction,
  seatWind: Direction,
  rng: Rng,
  kansaiChiitoitsu = false,
  attempts = 12,
): Assignment | null {
  for (let i = 0; i < attempts; i++) {
    const assignment = tryAssign(
      skeleton,
      plan,
      roundWind,
      seatWind,
      rng,
      kansaiChiitoitsu,
    );
    if (assignment) return assignment;
  }
  return null;
}
