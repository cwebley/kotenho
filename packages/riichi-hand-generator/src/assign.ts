import type { Direction, HandInput, MahjongTile, Meld } from "riichi-score";
import type { Rng } from "./rng.js";
import type { Block, PairClass, Skeleton } from "./skeleton.js";

const SUITS = ["m", "p", "s"] as const;
const DIRECTIONS: Direction[] = ["east", "south", "west", "north"];
const WIND_TILES: Record<Direction, MahjongTile> = {
  east: "1z",
  south: "2z",
  west: "3z",
  north: "4z",
};
const DRAGONS: MahjongTile[] = ["5z", "6z", "7z"];

const suited = (rank: number, suit: string): MahjongTile =>
  `${rank}${suit}` as MahjongTile;

/** Run start positions and which offset the winning tile occupies, per wait. */
function hostRunOptions(wait: string): { start: number; winOffset: number }[] {
  const out: { start: number; winOffset: number }[] = [];
  if (wait === "ryanmen") {
    // Winning on the low end needs a tile above the run (n+3 <= 9); winning on
    // the high end needs one below it (n-1 >= 1). Otherwise it is a penchan.
    for (let n = 1; n <= 6; n++) out.push({ start: n, winOffset: 0 });
    for (let n = 2; n <= 7; n++) out.push({ start: n, winOffset: 2 });
  } else if (wait === "kanchan") {
    for (let n = 1; n <= 7; n++) out.push({ start: n, winOffset: 1 });
  } else if (wait === "penchan") {
    out.push({ start: 1, winOffset: 2 }); // held 1-2, waiting only on 3
    out.push({ start: 7, winOffset: 0 }); // held 8-9, waiting only on 7
  }
  return out;
}

function tripletTileOptions(block: Block): MahjongTile[] {
  if (block.edge === "simple") {
    return SUITS.flatMap((suit) =>
      [2, 3, 4, 5, 6, 7, 8].map((rank) => suited(rank, suit)),
    );
  }
  return [
    ...SUITS.flatMap((suit) => [suited(1, suit), suited(9, suit)]),
    ...(["1z", "2z", "3z", "4z", "5z", "6z", "7z"] as MahjongTile[]),
  ];
}

function pairTileOptions(
  pair: PairClass,
  roundWind: Direction,
  seatWind: Direction,
): MahjongTile[] {
  const round = WIND_TILES[roundWind];
  const seat = WIND_TILES[seatWind];
  if (pair === "doubleWind") {
    return round === seat ? [round] : [];
  }
  if (pair === "yakuhai") {
    const value = [...DRAGONS, round, seat];
    // A double wind pair is its own class; exclude it here.
    return round === seat ? DRAGONS : [...new Set(value)];
  }
  const excluded = new Set<MahjongTile>([...DRAGONS, round, seat]);
  return [
    ...SUITS.flatMap((suit) =>
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map((rank) => suited(rank, suit)),
    ),
    ...(["1z", "2z", "3z", "4z"] as MahjongTile[]),
  ].filter((tile) => !excluded.has(tile));
}

const ALL_TILES: MahjongTile[] = [
  ...SUITS.flatMap((suit) =>
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((rank) => suited(rank, suit)),
  ),
  ...(["1z", "2z", "3z", "4z", "5z", "6z", "7z"] as MahjongTile[]),
];

interface ConcreteBlock {
  block: Block;
  tiles: MahjongTile[];
}

/** Seven distinct pairs, concealed, won on a tanki. */
function assignChiitoitsu(
  skeleton: Skeleton,
  roundWind: Direction,
  seatWind: Direction,
  rng: Rng,
): HandInput {
  const pairs = rng.shuffled(ALL_TILES).slice(0, 7);
  const winningTile = rng.pick(pairs);
  const closedTiles: MahjongTile[] = [];
  for (const tile of pairs) closedTiles.push(tile, tile);
  closedTiles.splice(closedTiles.indexOf(winningTile), 1);

  return {
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
  };
}

function meldTypeFor(block: Block): Meld["type"] {
  if (block.kind === "kan") return block.called ? "daiminkan" : "ankan";
  if (block.kind === "run") return "run";
  return "set";
}

/**
 * Fill a skeleton with concrete tiles. Returns null when the draw violates the
 * four-copy limit; the caller simply retries with a fresh draw.
 */
function tryAssign(
  skeleton: Skeleton,
  roundWind: Direction,
  seatWind: Direction,
  rng: Rng,
): HandInput | null {
  if (skeleton.shape === "chiitoitsu") {
    return assignChiitoitsu(skeleton, roundWind, seatWind, rng);
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

  const concrete: ConcreteBlock[] = [];
  let winningTile: MahjongTile | null = null;

  for (let i = 0; i < skeleton.blocks.length; i++) {
    const block = skeleton.blocks[i];
    const isHost = i === skeleton.waitHost;

    if (block.kind === "run") {
      const options = isHost
        ? hostRunOptions(skeleton.wait)
        : Array.from({ length: 7 }, (_, k) => ({ start: k + 1, winOffset: -1 }));
      if (!options.length) return null;
      const choice = rng.pick(options);
      const suit = rng.pick(SUITS);
      const tiles = [0, 1, 2].map((offset) =>
        suited(choice.start + offset, suit),
      );
      if (!take(tiles)) return null;
      if (isHost) winningTile = tiles[choice.winOffset];
      concrete.push({ block, tiles });
      continue;
    }

    const size = block.kind === "kan" ? 4 : 3;
    const tile = rng.pick(tripletTileOptions(block));
    const tiles = Array.from({ length: size }, () => tile);
    if (!take(tiles)) return null;
    if (isHost) winningTile = tile;
    concrete.push({ block, tiles });
  }

  const pairOptions = pairTileOptions(skeleton.pair, roundWind, seatWind);
  if (!pairOptions.length) return null;
  const pairTile = rng.pick(pairOptions);
  if (!take([pairTile, pairTile])) return null;
  if (skeleton.waitHost === -1) winningTile = pairTile;

  if (!winningTile) return null;

  const openMelds: Meld[] = [];
  const closedTiles: MahjongTile[] = [];
  for (const { block, tiles } of concrete) {
    const inMeld = block.called || block.kind === "kan";
    if (inMeld) {
      openMelds.push({
        type: meldTypeFor(block),
        tiles: [...tiles],
        // Ankan is self-drawn; riichi-score still requires the field.
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
  };
}

export function assignTiles(
  skeleton: Skeleton,
  roundWind: Direction,
  seatWind: Direction,
  rng: Rng,
  attempts = 12,
): HandInput | null {
  for (let i = 0; i < attempts; i++) {
    const handInput = tryAssign(skeleton, roundWind, seatWind, rng);
    if (handInput) return handInput;
  }
  return null;
}
