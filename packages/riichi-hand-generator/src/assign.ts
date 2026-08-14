import type {
  Direction,
  HandInput,
  MahjongTile,
  Meld,
  WaitType,
} from "riichi-score";
import type { Domain, TilePlan } from "./plan.js";
import { runStarts } from "./plan.js";
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

const suited = (rank: number, suit: string): MahjongTile =>
  `${rank}${suit}` as MahjongTile;
const isHonor = (tile: MahjongTile): boolean => tile.endsWith("z");

export const groupSignature = (tiles: readonly string[]): string =>
  [...tiles].sort().join("");

export function readingSignature(reading: IntendedReading): string {
  if (reading.shape !== "standard") return reading.shape;
  return `${[...reading.groups].sort().join("|")}/${reading.pair}/${reading.wait}`;
}

const ORPHANS: MahjongTile[] = [
  "1m", "9m", "1p", "9p", "1s", "9s",
  "1z", "2z", "3z", "4z", "5z", "6z", "7z",
];

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
      closedTiles,
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
  const numbered = domain.suits.flatMap((suit) => {
    const out: MahjongTile[] = [];
    for (let rank = domain.minRank; rank <= domain.maxRank; rank++) {
      const terminal = rank === 1 || rank === 9;
      const wantsTerminalOrHonor = block.edge === "terminalOrHonor";
      if (wantsTerminalOrHonor !== terminal) continue;
      out.push(suited(rank, suit));
    }
    return out;
  });
  if (block.edge === "simple") return numbered;
  return domain.honorsAllowed ? [...numbered, ...HONORS] : numbered;
}

function pairOptions(
  pairClass: PairClass,
  domain: Domain,
  roundWind: Direction,
  seatWind: Direction,
): MahjongTile[] {
  const round = WIND_TILES[roundWind];
  const seat = WIND_TILES[seatWind];
  if (pairClass === "doubleWind") return round === seat ? [round] : [];
  if (pairClass === "yakuhai") {
    if (!domain.honorsAllowed) return [];
    const value = round === seat ? DRAGONS : [...DRAGONS, round, seat];
    return [...new Set(value)];
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
  return [...numbered, ...honors];
}

/** Where the winning tile sits in a run, given the wait. */
function winFromRun(tiles: MahjongTile[], wait: WaitType): MahjongTile | null {
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
  return options.length ? options[0] : null;
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
): Assignment | null {
  const pool = ALL_TILES.filter((tile) => {
    if (isHonor(tile)) return domain.honorsAllowed;
    if (!domain.suits.includes(tile[1] as (typeof SUITS)[number])) return false;
    const rank = Number(tile[0]);
    return rank >= domain.minRank && rank <= domain.maxRank;
  });
  if (pool.length < 7) return null;

  const pairs = rng.shuffled(pool).slice(0, 7);
  if (domain.requireHonor && !pairs.some(isHonor)) return null;

  const winningTile = rng.pick(pairs);
  const closedTiles: MahjongTile[] = [];
  for (const tile of pairs) closedTiles.push(tile, tile);
  closedTiles.splice(closedTiles.indexOf(winningTile), 1);

  return {
    handInput: {
      closedTiles,
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

function tryAssign(
  skeleton: Skeleton,
  plan: TilePlan,
  roundWind: Direction,
  seatWind: Direction,
  rng: Rng,
): Assignment | null {
  const { domain } = plan;
  if (skeleton.shape === "kokushi") {
    return assignKokushi(skeleton, roundWind, seatWind, rng);
  }
  if (skeleton.shape === "chiitoitsu") {
    return assignChiitoitsu(skeleton, domain, roundWind, seatWind, rng);
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

  const starts = runStarts(domain);
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
    const tile = rng.pick(options);
    const size = block.kind === "kan" ? 4 : 3;
    const tiles = Array.from({ length: size }, () => tile);
    if (!take(tiles)) return null;
    concrete.push({ block, tiles });
  }

  const pairTile =
    plan.pair ?? rng.pick(pairOptions(skeleton.pair, domain, roundWind, seatWind) ?? []);
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
        ? winFromRun(host.tiles, skeleton.wait)
        : host.tiles[0];
  }
  if (!winningTile) return null;

  const openMelds: Meld[] = [];
  const closedTiles: MahjongTile[] = [];
  for (const { block, tiles } of concrete) {
    if (block.called || block.kind === "kan") {
      openMelds.push({
        type: meldTypeFor(block),
        tiles: [...tiles],
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
      closedTiles,
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
  attempts = 12,
): Assignment | null {
  for (let i = 0; i < attempts; i++) {
    const assignment = tryAssign(skeleton, plan, roundWind, seatWind, rng);
    if (assignment) return assignment;
  }
  return null;
}
