import type { Direction, GroupType, MahjongTile, YakuName } from "riichi-score";
import { matchGroups, type RequiredPlan, type RequiredWin } from "./required.js";
import type { Rng } from "./rng.js";
import type { Block, Skeleton } from "./skeleton.js";
import type { YakuPolicy } from "./types.js";
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
  honorsOnly: boolean;
  greenOnly: boolean;
  requireHonor: boolean;
  pair: "any" | "yaochu" | "terminal" | "numbered";
  /**
   * Avoid repeating a run unless a duplicate-run yaku was asked for. Worth more
   * than the composition strategy itself: it took the worst measured *concealed*
   * spec from 31% to 88%. Menzen-scoped — iipeiko and ryanpeikou are the yaku it
   * guards against and both require a concealed hand, so planTiles leaves it off
   * for open ones.
   */
  avoidDuplicateRuns: boolean;
  /**
   * Keep dragons and the round/seat winds out of triplets. A value triplet is a
   * yaku on its own, so it contaminates any exact spec that did not ask for it —
   * measured at ~70% of the residue once shape-level exclusion was in place.
   */
  forbiddenTriplets: MahjongTile[];
  /** Tiles already reserved for a required triplet cannot also be the pair. */
  forbiddenPairs: MahjongTile[];
}

export interface TilePlan {
  domain: Domain;
  /** Block index → the exact tiles that block must hold. */
  fixed: Map<number, MahjongTile[]>;
  /** Forced pair tile, when a yaku demands one. */
  pair?: MahjongTile;
  /** Chuuren's multiset is assigned directly, not block by block. */
  chuuren?: true;
  /**
   * Author-pinned winning tile. The wait host can offer more than one legal
   * winning tile — 567p won on 5p and on 7p are both ryanmen — so without this
   * the assigner would choose between them at random.
   */
  winningTile?: MahjongTile;
  /** Block index → meld type, when the author pinned one. */
  meldTypes?: Map<number, GroupType>;
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
  if (domain.greenOnly) {
    return block.kind === "run" && block.edge !== "terminalRun" ? [2] : [];
  }
  return block.edge === "terminalRun"
    ? starts.filter((start) => start === 1 || start === 7)
    : starts.filter((start) => start !== 1 && start !== 7);
}

const GREEN_TILES = new Set<MahjongTile>(["2s", "3s", "4s", "6s", "8s", "6z"]);

/** Whether a concrete tile survives the domain the required yaku narrowed. */
function tileFitsDomain(tile: MahjongTile, domain: Domain): boolean {
  if (domain.greenOnly && !GREEN_TILES.has(tile)) return false;
  if (tile[1] === "z") return domain.honorsAllowed;
  if (domain.honorsOnly) return false;
  if (!domain.suits.includes(tile[1] as Suit)) return false;
  const rank = Number(tile[0]);
  return rank >= domain.minRank && rank <= domain.maxRank;
}

function baseDomain(): Domain {
  return {
    suits: [...SUITS],
    minRank: 1,
    maxRank: 9,
    honorsAllowed: true,
    honorsOnly: false,
    greenOnly: false,
    requireHonor: false,
    pair: "any",
    avoidDuplicateRuns: true,
    forbiddenTriplets: [],
    forbiddenPairs: [],
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
  tsuuiisou: 5,
  chuuren: 5,
};

export function planTiles(
  skeleton: Skeleton,
  yaku: YakuName[],
  roundWind: Direction,
  seatWind: Direction,
  rng: Rng,
  yakuPolicy: YakuPolicy = "exact",
  required?: RequiredPlan,
): TilePlan | null {
  const domain = baseDomain();
  const avoidExtraYaku = yakuPolicy === "exact" && yaku.length > 0;
  // Duplicate runs are avoided only where they could actually contaminate an
  // exact yaku list. Both duplicate-run yaku are menzen-only, so on an open
  // hand the flag buys nothing and costs variety — measured at 9.4% of accepted
  // open hands carrying a duplicate run once it is lifted. It stays on for
  // concealed hands, where it also suppresses the accidental honitsu that
  // packing six tiles into one suit invites.
  if (!avoidExtraYaku || !skeleton.menzen) domain.avoidDuplicateRuns = false;

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
    if (constraints.honorsOnly) domain.honorsOnly = true;
    if (constraints.greenOnly) {
      domain.greenOnly = true;
      domain.suits = ["s"];
      domain.minRank = 2;
      domain.maxRank = 8;
    }
    if (constraints.requireHonor) domain.requireHonor = true;
    if (constraints.pair === "terminal" || constraints.pair === "numbered") {
      domain.pair = constraints.pair;
    } else if (constraints.pair === "yaochu" && domain.pair === "any") {
      domain.pair = "yaochu";
    }
    if (constraints.singleSuit) domain.suits = [rng.pick(domain.suits)];
  }
  if (domain.requireHonor && !domain.honorsAllowed) return null;
  if (domain.honorsOnly && !domain.honorsAllowed) return null;
  if (
    yaku.includes("iipeiko") ||
    yaku.includes("ryanpeikou") ||
    yaku.includes("chanta") ||
    yaku.includes("junchan") ||
    yaku.includes("ryuuiisou")
  ) {
    domain.avoidDuplicateRuns = false;
  }

  const YAKUHAI: [string, MahjongTile][] = [
    ["haku", "5z"],
    ["hatsu", "6z"],
    ["chun", "7z"],
    ["round-wind", WIND_TILES[roundWind]],
    ["seat-wind", WIND_TILES[seatWind]],
  ];
  const wantsWindYakuman =
    yaku.includes("shousuushii") || yaku.includes("daisuushii");
  if (avoidExtraYaku) {
    for (const [name, tile] of YAKUHAI) {
      const isWind = name === "round-wind" || name === "seat-wind";
      if (!yaku.includes(name as YakuName) && !(wantsWindYakuman && isWind)) {
        domain.forbiddenTriplets.push(tile);
      }
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
  const freeRuns = rng.shuffled(runBlocks);
  const freeTriplets = rng.shuffled(tripletBlocks);

  // 2. Author-pinned groups go down before any placer runs. They are the
  //    tightest constraint there is — fully concrete — so the same tightest-first
  //    rule that orders PLACER_ORDER puts them first, and every later placer
  //    sees a smaller but still consistent set of free slots.
  const meldTypes = new Map<number, GroupType>();
  let requiredPair: MahjongTile | undefined;
  if (required) {
    // A pin can contradict a yaku's domain — "123p" under tanyao, say. Failing
    // here rather than assigning the hand keeps a doomed candidate out of the
    // verifier. Under singleSuit the domain is drawn per attempt, so returning
    // null is a retry with a different suit rather than a dead end.
    const pinned = [
      ...required.groups.flatMap((group) => group.tiles),
      ...(required.pair ? [required.pair] : []),
    ];
    if (!pinned.every((tile) => tileFitsDomain(tile, domain))) return null;
    const choices: { win?: RequiredWin; matching: number[] }[] = [];
    if (required.winningTile) {
      for (const win of required.wins) {
        if (win.wait !== skeleton.wait) continue;
        if (win.group === -1 ? skeleton.waitHost !== -1 : skeleton.waitHost === -1) {
          continue;
        }
        for (const matching of matchGroups(skeleton, required, win)) {
          choices.push({ win, matching });
        }
      }
    } else {
      for (const matching of matchGroups(skeleton, required)) {
        choices.push({ matching });
      }
    }
    if (!choices.length) return null;

    const { matching } = rng.pick(choices);
    matching.forEach((block, index) => {
      const group = required.groups[index];
      fixed.set(block, [...group.tiles]);
      if (group.meldType) meldTypes.set(block, group.meldType);
      const runSlot = freeRuns.indexOf(block);
      if (runSlot >= 0) freeRuns.splice(runSlot, 1);
      const tripletSlot = freeTriplets.indexOf(block);
      if (tripletSlot >= 0) freeTriplets.splice(tripletSlot, 1);
    });
    requiredPair = required.pair;
    // A pinned triplet or kan already holds three or four copies, so its tile
    // cannot also be the pair. A pinned run holds one copy of each, so it can.
    for (const group of required.groups) {
      if (group.kind !== "run") domain.forbiddenPairs.push(group.tiles[0]);
    }
  }
  const commonRunStarts = (indices: number[]): number[] =>
    indices.length === 0
      ? []
      : runStartsFor(skeleton.blocks[indices[0]], domain).filter((start) =>
          indices.every((index) =>
            runStartsFor(skeleton.blocks[index], domain).includes(start),
          ),
        );
  const removeRunSlots = (indices: number[]): void => {
    for (const index of indices) {
      freeRuns.splice(freeRuns.indexOf(index), 1);
    }
  };
  const commonRunChoice = (
    count: number,
    minimumStarts = 1,
  ): { indices: number[]; starts: number[] } | null => {
    const choices: { indices: number[]; starts: number[] }[] = [];
    const visit = (start: number, indices: number[]): void => {
      if (indices.length === count) {
        const starts = commonRunStarts(indices);
        if (starts.length >= minimumStarts) choices.push({ indices, starts });
        return;
      }
      for (let index = start; index < freeRuns.length; index++) {
        visit(index + 1, [...indices, freeRuns[index]]);
      }
    };
    visit(0, []);
    return choices.length ? rng.pick(choices) : null;
  };
  const orderedRunChoice = (starts: number[]): number[] | null => {
    const choices: number[][] = [];
    const visit = (
      position: number,
      remaining: number[],
      selected: number[],
    ): void => {
      if (position === starts.length) {
        choices.push(selected);
        return;
      }
      for (const index of remaining) {
        if (
          !runStartsFor(skeleton.blocks[index], domain).includes(
            starts[position],
          )
        ) {
          continue;
        }
        visit(
          position + 1,
          remaining.filter((candidate) => candidate !== index),
          [...selected, index],
        );
      }
    };
    visit(0, [...freeRuns], []);
    return choices.length ? rng.pick(choices) : null;
  };
  const placers = rng
    .shuffled(yaku)
    .filter((name) => templateFor(name)?.placer)
    .sort(
      (a, b) =>
        PLACER_ORDER[templateFor(a)!.placer!] -
        PLACER_ORDER[templateFor(b)!.placer!],
    );

  let pair: MahjongTile | undefined;
  let chuuren = false;

  for (const name of placers) {
    const kind = templateFor(name)!.placer!;

    if (kind === "ittsuu") {
      const indices = orderedRunChoice([1, 4, 7]);
      if (!indices) return null;
      const suit = rng.pick(domain.suits);
      for (const [index, start] of indices.map(
        (index, position) => [index, [1, 4, 7][position]] as const,
      )) {
        fixed.set(index, makeRun(start, suit));
      }
      removeRunSlots(indices);
    } else if (kind === "sanshoku") {
      const choice = domain.suits.length < 3 ? null : commonRunChoice(3);
      if (!choice) {
        return null;
      }
      const start = rng.pick(choice.starts);
      for (const [index, suit] of choice.indices.map(
        (index, position) => [index, SUITS[position]] as const,
      )) {
        fixed.set(index, makeRun(start, suit));
      }
      removeRunSlots(choice.indices);
    } else if (kind === "ryanpeikou") {
      const choice = commonRunChoice(4, 2);
      if (!choice) return null;
      const selectedStarts = rng.shuffled(choice.starts).slice(0, 2);
      for (const [start, offset] of selectedStarts.map(
        (start, index) => [start, index * 2] as const,
      )) {
        const suit = rng.pick(domain.suits);
        fixed.set(choice.indices[offset], makeRun(start, suit));
        fixed.set(choice.indices[offset + 1], makeRun(start, suit));
      }
      removeRunSlots(choice.indices);
    } else if (kind === "iipeiko") {
      const choice = commonRunChoice(2);
      if (!choice) return null;
      const start = rng.pick(choice.starts);
      const suit = rng.pick(domain.suits);
      fixed.set(choice.indices[0], makeRun(start, suit));
      fixed.set(choice.indices[1], makeRun(start, suit));
      removeRunSlots(choice.indices);
    } else if (kind === "yakuhai") {
      if (!domain.honorsAllowed) return null;
      const tile =
        name === "haku"
          ? "5z"
          : name === "hatsu"
            ? "6z"
            : name === "chun"
              ? "7z"
              : name === "round-wind"
                ? WIND_TILES[roundWind]
                : WIND_TILES[seatWind];
      domain.forbiddenPairs.push(tile);
      // A double wind earns both yakuhai from one physical triplet.
      if ([...fixed.values()].some((tiles) => tiles[0] === tile)) continue;
      if (!freeTriplets.length) return null;
      const index = freeTriplets.shift()!;
      const size = skeleton.blocks[index].kind === "kan" ? 4 : 3;
      fixed.set(
        index,
        Array.from({ length: size }, () => tile as MahjongTile),
      );
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
        fixed.set(
          index,
          Array.from({ length: size }, () => tile),
        );
      }
      pair = DRAGONS.find(
        (tile) => ![...dragonTriplets, ...selected].includes(tile),
      );
      if (!pair) return null;
    } else if (kind === "daisangen") {
      if (freeTriplets.length < DRAGONS.length) return null;
      for (const tile of rng.shuffled(DRAGONS)) {
        const index = freeTriplets.shift()!;
        const size = skeleton.blocks[index].kind === "kan" ? 4 : 3;
        fixed.set(
          index,
          Array.from({ length: size }, () => tile),
        );
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
        fixed.set(
          index,
          Array.from({ length: size }, () => tile),
        );
      }
      pair = WINDS.find(
        (tile) => ![...windTriplets, ...selected].includes(tile),
      );
      if (!pair) return null;
      // The fourth wind would upgrade this hand to daisuushii.
      domain.forbiddenTriplets.push(...WINDS);
    } else if (kind === "daisuushii") {
      if (freeTriplets.length < WINDS.length) return null;
      for (const tile of rng.shuffled(WINDS)) {
        const index = freeTriplets.shift()!;
        const size = skeleton.blocks[index].kind === "kan" ? 4 : 3;
        fixed.set(
          index,
          Array.from({ length: size }, () => tile),
        );
      }
    } else if (kind === "tsuuiisou") {
      if (skeleton.shape === "chiitoitsu") continue;
      if (freeTriplets.length < 4) return null;
      const winds = rng.shuffled(WINDS).slice(0, 2);
      const dragons = rng.shuffled(DRAGONS).slice(0, 2);
      for (const tile of [...winds, ...dragons]) {
        const index = freeTriplets.shift()!;
        const size = skeleton.blocks[index].kind === "kan" ? 4 : 3;
        fixed.set(
          index,
          Array.from({ length: size }, () => tile),
        );
      }
      const used = new Set([...winds, ...dragons]);
      pair = rng.pick(HONORS.filter((tile) => !used.has(tile)));
    } else if (kind === "chuuren") {
      chuuren = true;
    }
  }

  // 3. `requireHonor` is deliberately NOT placed here. Forcing the honor into a
  //    fixed location makes every hand carry the bare minimum — one honor, in
  //    the same spot. The assigner samples honors per block and rejects a hand
  //    that ends up with none, which satisfies the same rule while leaving the
  //    count free to vary.

  // A placer that forces its own pair (shousangen, tsuuiisou) cannot coexist
  // with a pinned one.
  if (requiredPair !== undefined && pair !== undefined && pair !== requiredPair) {
    return null;
  }
  // Chuuren's multiset is assigned whole rather than block by block, so it has
  // nowhere to honour a pin.
  if (required && chuuren) return null;

  return {
    domain,
    fixed,
    pair: requiredPair ?? pair,
    chuuren: chuuren || undefined,
    ...(required?.winningTile ? { winningTile: required.winningTile } : {}),
    ...(meldTypes.size ? { meldTypes } : {}),
  };
}
