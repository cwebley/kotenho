import type { GroupType, MahjongTile, WaitType } from "riichi-score";
import type { BlockKind, EdgeClass, PairClass, Skeleton } from "./skeleton.js";
import type { GenerateSpec, RequiredGroupSpec } from "./types.js";

/**
 * Author-pinned tiles. A drill about a complex wait cannot be described by the
 * scoring dimensions the rest of the spec exposes — riichi-score classifies a
 * wait from the group the winning tile completed, so a sanmenchan and a plain
 * ryanmen both report `"ryanmen"`. The shape lives in the thirteen tiles before
 * the win, so it has to be pinned directly.
 *
 * Pinning is exact rather than searched: a required group is a concrete block,
 * so it is matched against the skeleton table like every other structural
 * constraint, and an empty match is a proof of impossibility.
 */
export interface RequiredGroup {
  /** Sorted, so index 0/1/2 line up with runWinOptions. */
  tiles: MahjongTile[];
  kind: BlockKind;
  edge: EdgeClass;
  called: boolean;
  /** Set only when the author asked for a specific meld type. */
  meldType?: GroupType;
}

/** A way the pinned winning tile can be won. `group: -1` means the pair. */
export interface RequiredWin {
  group: number;
  wait: WaitType;
}

export interface RequiredPlan {
  groups: RequiredGroup[];
  pair?: MahjongTile;
  winningTile?: MahjongTile;
  /**
   * Every reading of the pinned winning tile. A tile can appear both in a run
   * and in the pair (234p/567p with a 7p pair, won on 7p), and both readings are
   * legitimate drills — so the choice is left to the skeleton filter, where
   * `waitType` can narrow it, rather than resolved here.
   */
  wins: RequiredWin[];
}

export type RequiredResult =
  | { ok: true; plan?: RequiredPlan }
  | { ok: false; reason: string };

const DRAGONS = new Set<MahjongTile>(["5z", "6z", "7z"]);

const rankOf = (tile: MahjongTile): number => Number(tile[0]);
const isHonor = (tile: MahjongTile): boolean => tile[1] === "z";

/**
 * Accepts both the compact spelling and the explicit one — "234p" and
 * "2p3p4p" describe the same group, and lesson authors write both.
 */
export function parseTileGroup(
  text: string,
): { ok: true; tiles: MahjongTile[] } | { ok: false; reason: string } {
  const trimmed = text.trim();
  const matches = [...trimmed.matchAll(/(\d+)([mpsz])/g)];
  const consumed = matches.reduce((total, match) => total + match[0].length, 0);
  if (!matches.length || consumed !== trimmed.length) {
    return { ok: false, reason: `"${text}" is not a readable tile group` };
  }
  const tiles: MahjongTile[] = [];
  for (const [, ranks, suit] of matches) {
    for (const digit of ranks) {
      const rank = Number(digit);
      if (rank === 0) {
        return {
          ok: false,
          reason: `"${text}" names a red five; ask for red fives with akaDora instead`,
        };
      }
      if (suit === "z" && rank > 7) {
        return { ok: false, reason: `"${text}" is not a valid honor tile` };
      }
      tiles.push(`${rank}${suit}` as MahjongTile);
    }
  }
  return { ok: true, tiles };
}

/**
 * The structural class of a concrete group, in skeleton.ts's own vocabulary.
 * `label` is the author's own spelling, so a rejection quotes what they wrote
 * rather than the expanded form they did not.
 */
export function classifyGroup(
  tiles: readonly MahjongTile[],
  label?: string,
):
  | { ok: true; kind: BlockKind; edge: EdgeClass }
  | { ok: false; reason: string } {
  const shown = label ?? tiles.join("");
  const identical = tiles.every((tile) => tile === tiles[0]);

  if (identical) {
    if (tiles.length !== 3 && tiles.length !== 4) {
      return {
        ok: false,
        reason: `"${shown}" is neither a triplet nor a kan`,
      };
    }
    const terminal = isHonor(tiles[0]) || rankOf(tiles[0]) === 1 || rankOf(tiles[0]) === 9;
    return {
      ok: true,
      kind: tiles.length === 4 ? "kan" : "triplet",
      edge: terminal ? "terminalOrHonor" : "simple",
    };
  }

  const suit = tiles[0][1];
  const consecutive =
    tiles.length === 3 &&
    suit !== "z" &&
    tiles.every((tile) => tile[1] === suit) &&
    rankOf(tiles[1]) === rankOf(tiles[0]) + 1 &&
    rankOf(tiles[2]) === rankOf(tiles[1]) + 1;
  if (!consecutive) {
    return { ok: false, reason: `"${shown}" is not a run, triplet, or kan` };
  }
  const start = rankOf(tiles[0]);
  return {
    ok: true,
    kind: "run",
    edge: start === 1 || start === 7 ? "terminalRun" : "simple",
  };
}

/**
 * Which tiles of a run can be the winning one for a given wait. The single
 * source of truth for that mapping: `winFromRun` picks from this list, and the
 * skeleton filter reads it backwards to learn what wait a pinned tile forces.
 */
export function runWinOptions(
  tiles: readonly MahjongTile[],
  wait: WaitType,
): MahjongTile[] {
  const start = rankOf(tiles[0]);
  if (wait === "kanchan") return [tiles[1]];
  if (wait === "penchan") {
    if (start === 1) return [tiles[2]];
    if (start === 7) return [tiles[0]];
    return [];
  }
  if (wait !== "ryanmen") return [];
  // Winning on an end must leave a genuine two-sided wait.
  const options: MahjongTile[] = [];
  if (start + 3 <= 9) options.push(tiles[0]);
  if (start - 1 >= 1) options.push(tiles[2]);
  return options;
}

const RUN_WAITS: WaitType[] = ["ryanmen", "kanchan", "penchan"];

/** The wait a pinned winning tile forces on a pinned group, if any. */
function waitForGroup(
  group: RequiredGroup,
  winningTile: MahjongTile,
): WaitType | null {
  // You cannot win into a call, and a kan is never completed by the winning tile.
  if (group.called || group.kind === "kan") return null;
  if (group.kind === "triplet") {
    return group.tiles[0] === winningTile ? "shanpon" : null;
  }
  for (const wait of RUN_WAITS) {
    if (runWinOptions(group.tiles, wait).includes(winningTile)) return wait;
  }
  return null;
}

/** Whether a concrete pair tile can wear a skeleton's pair class. */
export function pairClassAllows(
  pairTile: MahjongTile,
  pairClass: PairClass,
): boolean {
  if (DRAGONS.has(pairTile)) return pairClass === "yakuhai";
  // A wind's class depends on the round and seat winds, which are chosen per
  // attempt — so every class stays open here and resolveWinds settles it.
  if (isHonor(pairTile)) return true;
  return pairClass === "plain";
}

const MELD_TYPE_SHAPES: Record<GroupType, { kind: BlockKind; called: boolean }> = {
  run: { kind: "run", called: true },
  set: { kind: "triplet", called: true },
  ankan: { kind: "kan", called: false },
  daiminkan: { kind: "kan", called: true },
  shouminkan: { kind: "kan", called: true },
};

/**
 * Parse and validate every pinned tile once, before any skeleton is examined.
 * Returns `plan: undefined` when the spec pins nothing.
 */
export function parseRequired(spec: GenerateSpec): RequiredResult {
  const specs: RequiredGroupSpec[] = spec.requiredGroups ?? [];
  if (!specs.length && !spec.requiredPair && !spec.requiredWinningTile) {
    return { ok: true };
  }
  if (specs.length > 4) {
    return { ok: false, reason: "a hand has at most four groups" };
  }

  const groups: RequiredGroup[] = [];
  for (const entry of specs) {
    const source = typeof entry === "string" ? { tiles: entry } : entry;
    const parsed = parseTileGroup(source.tiles);
    if (!parsed.ok) return parsed;
    const tiles = [...parsed.tiles].sort(
      (a, b) => rankOf(a) - rankOf(b) || a.localeCompare(b),
    );
    const shape = classifyGroup(tiles, source.tiles);
    if (!shape.ok) return shape;

    let called = source.called ?? false;
    if (source.meldType) {
      const expected = MELD_TYPE_SHAPES[source.meldType];
      if (!expected || expected.kind !== shape.kind) {
        return {
          ok: false,
          reason: `meldType ${source.meldType} needs a ${expected?.kind ?? "meld"}, but "${source.tiles}" is a ${shape.kind}`,
        };
      }
      if (source.called !== undefined && source.called !== expected.called) {
        return {
          ok: false,
          reason: `${source.meldType} is ${expected.called ? "always" : "never"} called from another player`,
        };
      }
      called = expected.called;
    }
    groups.push({ tiles, kind: shape.kind, edge: shape.edge, called, ...(source.meldType ? { meldType: source.meldType } : {}) });
  }

  let pair: MahjongTile | undefined;
  if (spec.requiredPair !== undefined) {
    const parsed = parseTileGroup(spec.requiredPair);
    if (!parsed.ok) return parsed;
    if (parsed.tiles.length !== 2 || parsed.tiles[0] !== parsed.tiles[1]) {
      return { ok: false, reason: `"${spec.requiredPair}" is not a pair` };
    }
    pair = parsed.tiles[0];
  }

  // Four copies of a tile exist. Pinned tiles alone can already exceed that.
  const counts = new Map<MahjongTile, number>();
  for (const tile of [...groups.flatMap((g) => g.tiles), ...(pair ? [pair, pair] : [])]) {
    const next = (counts.get(tile) ?? 0) + 1;
    if (next > 4) {
      return { ok: false, reason: `the pinned tiles need ${next} copies of ${tile}` };
    }
    counts.set(tile, next);
  }

  let winningTile: MahjongTile | undefined;
  const wins: RequiredWin[] = [];
  if (spec.requiredWinningTile !== undefined) {
    const parsed = parseTileGroup(spec.requiredWinningTile);
    if (!parsed.ok) return parsed;
    if (parsed.tiles.length !== 1) {
      return {
        ok: false,
        reason: `"${spec.requiredWinningTile}" is not a single tile`,
      };
    }
    winningTile = parsed.tiles[0];

    groups.forEach((group, index) => {
      const wait = waitForGroup(group, winningTile!);
      if (wait) wins.push({ group: index, wait });
    });
    if (pair === winningTile) wins.push({ group: -1, wait: "tanki" });

    if (!wins.length) {
      return {
        ok: false,
        reason: `requiredWinningTile ${winningTile} must complete a concealed required group or the required pair`,
      };
    }
  }

  return { ok: true, plan: { groups, pair, winningTile, wins } };
}

/**
 * Every injective placement of the pinned groups onto a skeleton's blocks.
 * Small by construction — a standard hand has four blocks — so it is
 * enumerated rather than searched, and an empty result is a proof that this
 * skeleton cannot carry the pins.
 */
export function matchGroups(
  skeleton: Skeleton,
  plan: RequiredPlan,
  win?: RequiredWin,
): number[][] {
  if (skeleton.shape !== "standard") return [];
  const matchings: number[][] = [];
  const used = new Set<number>();

  const walk = (index: number, chosen: number[]): void => {
    if (index === plan.groups.length) {
      matchings.push([...chosen]);
      return;
    }
    const group = plan.groups[index];
    for (let block = 0; block < skeleton.blocks.length; block++) {
      if (used.has(block)) continue;
      const candidate = skeleton.blocks[block];
      if (
        candidate.kind !== group.kind ||
        candidate.edge !== group.edge ||
        candidate.called !== group.called
      ) {
        continue;
      }
      // The winning tile comes from the block hosting the wait, so the group
      // carrying it must land exactly there — and no other group may.
      if (win && win.group === index && block !== skeleton.waitHost) continue;
      if (win && win.group !== index && block === skeleton.waitHost) continue;
      used.add(block);
      chosen.push(block);
      walk(index + 1, chosen);
      chosen.pop();
      used.delete(block);
    }
  };
  walk(0, []);
  return matchings;
}

/** Whether a skeleton can carry every pin. Used by the skeleton filter. */
export function skeletonAcceptsRequired(
  skeleton: Skeleton,
  plan: RequiredPlan,
): boolean {
  if (skeleton.shape !== "standard") return false;
  if (plan.pair && !pairClassAllows(plan.pair, skeleton.pair)) return false;

  if (!plan.winningTile) {
    return matchGroups(skeleton, plan).length > 0;
  }
  return plan.wins.some((win) => {
    if (win.wait !== skeleton.wait) return false;
    if (win.group === -1) return skeleton.waitHost === -1 && matchGroups(skeleton, plan, win).length > 0;
    if (skeleton.waitHost === -1) return false;
    return matchGroups(skeleton, plan, win).length > 0;
  });
}
