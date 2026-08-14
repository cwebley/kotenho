import type { WaitType } from "riichi-score";
import type { GenerateSpec } from "./types.js";
import { skeletonSatisfies, templateFor } from "./yaku/templates.js";

/**
 * A skeleton is a hand with every tile identity removed, keeping only the
 * categories that affect scoring. Fu is a pure function of it — the fu table
 * cannot tell 1m from 9p from East, only "terminal or honor" — so the whole
 * space is small enough to enumerate once and index.
 */
export type BlockKind = "run" | "triplet" | "kan";
export type EdgeClass = "simple" | "terminalOrHonor";
export type PairClass = "plain" | "yakuhai" | "doubleWind";

export interface Block {
  kind: BlockKind;
  /** Called from another player: chi, pon, daiminkan. Ankan is NOT called. */
  called: boolean;
  edge: EdgeClass;
}

export type HandShape = "standard" | "chiitoitsu" | "kokushi";

export interface Skeleton {
  shape: HandShape;
  /** Empty for chiitoitsu, which is seven pairs rather than blocks. */
  blocks: Block[];
  pair: PairClass;
  wait: WaitType;
  /** Index into blocks, or -1 when the pair hosts the wait (tanki). */
  waitHost: number;
  tsumo: boolean;
  fu: number;
  rawFu: number;
  menzen: boolean;
  calledMelds: number;
  kanCount: number;
  pinfuShape: boolean;
}

const BLOCK_TYPES: Block[] = [
  { kind: "run", called: false, edge: "simple" },
  { kind: "run", called: true, edge: "simple" },
  { kind: "triplet", called: false, edge: "simple" },
  { kind: "triplet", called: true, edge: "simple" },
  { kind: "triplet", called: false, edge: "terminalOrHonor" },
  { kind: "triplet", called: true, edge: "terminalOrHonor" },
  { kind: "kan", called: false, edge: "simple" },
  { kind: "kan", called: true, edge: "simple" },
  { kind: "kan", called: false, edge: "terminalOrHonor" },
  { kind: "kan", called: true, edge: "terminalOrHonor" },
];

const PAIR_CLASSES: PairClass[] = ["plain", "yakuhai", "doubleWind"];
const WAITS: WaitType[] = [
  "ryanmen",
  "kanchan",
  "penchan",
  "shanpon",
  "tanki",
];

function blockFu(block: Block, scoredOpen: boolean): number {
  if (block.kind === "run") return 0;
  const open = block.called || scoredOpen;
  if (block.kind === "triplet") {
    if (block.edge === "simple") return open ? 2 : 4;
    return open ? 4 : 8;
  }
  if (block.edge === "simple") return open ? 8 : 16;
  return open ? 16 : 32;
}

function pairFu(pair: PairClass): number {
  if (pair === "yakuhai") return 2;
  if (pair === "doubleWind") return 4;
  return 0;
}

function waitFu(wait: WaitType): number {
  return wait === "kanchan" || wait === "penchan" || wait === "tanki" ? 2 : 0;
}

/** Fu, computed from shape alone. No tiles involved. */
export function computeFu(
  blocks: Block[],
  pair: PairClass,
  wait: WaitType,
  waitHost: number,
  tsumo: boolean,
): { rawFu: number; fu: number; pinfuShape: boolean } {
  const menzen = blocks.every((block) => !block.called);
  const allRuns = blocks.every((block) => block.kind === "run");
  const pinfuShape = allRuns && pair === "plain" && wait === "ryanmen";

  if (pinfuShape && menzen) {
    return { rawFu: 20, fu: tsumo ? 20 : 30, pinfuShape: true };
  }

  let raw = 20;
  if (!tsumo && menzen) raw += 10;
  if (tsumo && !pinfuShape) raw += 2;

  blocks.forEach((block, index) => {
    // A triplet completed by ron scores as an open triplet, though the hand
    // itself stays concealed.
    const scoredOpen = !tsumo && wait === "shanpon" && index === waitHost;
    raw += blockFu(block, scoredOpen);
  });
  raw += pairFu(pair);
  raw += waitFu(wait);

  // An open hand that would otherwise total 20 fu is floored to 30 (kuipinfu).
  const fu = pinfuShape && !menzen ? 30 : Math.ceil(raw / 10) * 10;
  return { rawFu: raw, fu, pinfuShape };
}

function combinationsWithRepetition<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  const walk = (start: number, current: T[]): void => {
    if (current.length === size) {
      out.push([...current]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      current.push(items[i]);
      walk(i, current);
      current.pop();
    }
  };
  walk(0, []);
  return out;
}

let cache: Skeleton[] | null = null;

/** Every legal standard-shape skeleton. Enumerated once, then cached. */
export function allSkeletons(): Skeleton[] {
  if (cache) return cache;
  const out: Skeleton[] = [];

  for (const blocks of combinationsWithRepetition(BLOCK_TYPES, 4)) {
    const kanCount = blocks.filter((b) => b.kind === "kan").length;
    const calledMelds = blocks.filter((b) => b.called).length;
    const menzen = calledMelds === 0;

    for (const wait of WAITS) {
      // The winning tile must land in a concealed block — you cannot win into
      // a call — and never in a kan, which cannot be completed by the winning
      // tile.
      let hosts: number[];
      if (wait === "tanki") {
        hosts = [-1];
      } else if (wait === "shanpon") {
        hosts = blocks
          .map((b, i) => (b.kind === "triplet" && !b.called ? i : -1))
          .filter((i) => i >= 0);
      } else {
        hosts = blocks
          .map((b, i) => (b.kind === "run" && !b.called ? i : -1))
          .filter((i) => i >= 0);
      }
      if (!hosts.length) continue;

      // Hosts that differ only by position produce identical skeletons; keep
      // the first of each distinct block signature.
      const seenHost = new Set<string>();
      for (const waitHost of hosts) {
        const key =
          waitHost === -1
            ? "pair"
            : `${blocks[waitHost].kind}:${blocks[waitHost].called}:${blocks[waitHost].edge}`;
        if (seenHost.has(key)) continue;
        seenHost.add(key);

        for (const pair of PAIR_CLASSES) {
          for (const tsumo of [false, true]) {
            const { rawFu, fu, pinfuShape } = computeFu(
              blocks,
              pair,
              wait,
              waitHost,
              tsumo,
            );
            out.push({
              shape: "standard",
              blocks,
              pair,
              wait,
              waitHost,
              tsumo,
              fu,
              rawFu,
              menzen,
              calledMelds,
              kanCount,
              pinfuShape,
            });
          }
        }
      }
    }
  }

  // Chiitoitsu is a single skeleton: seven pairs, always concealed, always a
  // tanki wait, always a flat 25 fu. Omitting it would make the engine claim
  // "fu: 25 is impossible", which is unsound — soundness matters more here than
  // completeness, because an unsatisfiable verdict is supposed to be a proof.
  for (const tsumo of [false, true]) {
    out.push({
      shape: "chiitoitsu",
      blocks: [],
      pair: "plain",
      wait: "tanki",
      waitHost: -1,
      tsumo,
      fu: 25,
      rawFu: 25,
      menzen: true,
      calledMelds: 0,
      kanCount: 0,
      pinfuShape: false,
    });
  }

  // Kokushi musou: thirteen orphans plus a duplicate, always concealed. Fu is
  // recorded as 0 because it is meaningless for a yakuman and varies with the
  // pair — which also means a fu-constrained spec never selects it, correctly.
  for (const tsumo of [false, true]) {
    out.push({
      shape: "kokushi",
      blocks: [],
      pair: "plain",
      wait: "tanki",
      waitHost: -1,
      tsumo,
      fu: 0,
      rawFu: 0,
      menzen: true,
      calledMelds: 0,
      kanCount: 0,
      pinfuShape: false,
    });
  }

  cache = out;
  return out;
}

/** Which spec field eliminated every candidate, for the unsatisfiable reason. */
const FILTERS: {
  name: string;
  applies: (spec: GenerateSpec) => boolean;
  keep: (s: Skeleton, spec: GenerateSpec) => boolean;
  reason: (spec: GenerateSpec) => string;
}[] = [
  {
    name: "handShape",
    applies: (spec) => spec.handShape !== undefined,
    keep: (s, spec) => s.shape === spec.handShape,
    reason: (spec) => `${spec.handShape} is not a shape this generator models`,
  },
  {
    name: "winMethod",
    applies: (spec) => spec.winMethod !== undefined,
    keep: (s, spec) => s.tsumo === (spec.winMethod === "tsumo"),
    reason: (spec) => `no hand shape can be won by ${spec.winMethod}`,
  },
  {
    name: "closed",
    applies: (spec) => spec.closed !== undefined,
    keep: (s, spec) => s.menzen === spec.closed,
    reason: (spec) =>
      spec.closed
        ? "no concealed hand shape satisfies the other constraints"
        : "no open hand shape satisfies the other constraints",
  },
  {
    name: "openMeldCount",
    applies: (spec) => spec.openMeldCount !== undefined,
    keep: (s, spec) => s.calledMelds === spec.openMeldCount,
    reason: (spec) =>
      `no hand shape has exactly ${spec.openMeldCount} called meld(s) alongside the other constraints`,
  },
  {
    name: "kanCount",
    applies: (spec) => spec.kanCount !== undefined,
    keep: (s, spec) => s.kanCount === spec.kanCount,
    reason: (spec) =>
      `no hand shape has exactly ${spec.kanCount} kan(s) alongside the other constraints`,
  },
  {
    name: "waitType",
    applies: (spec) => spec.waitType !== undefined,
    keep: (s, spec) => s.wait === spec.waitType,
    reason: (spec) => `no hand shape supports a ${spec.waitType} wait here`,
  },
  {
    name: "fu",
    applies: (spec) => spec.fu !== undefined,
    keep: (s, spec) => s.fu === spec.fu,
    reason: (spec) =>
      `no hand shape scores exactly ${spec.fu} fu under the other constraints`,
  },
  {
    // Tier-1 yaku are decided by shape alone, so they filter the table rather
    // than being aimed at during tile assignment.
    name: "yaku",
    applies: (spec) => (spec.yaku?.length ?? 0) > 0,
    keep: (s, spec) =>
      (spec.yaku ?? []).every((name) => {
        const constraints = templateFor(name)?.skeleton;
        return !constraints || skeletonSatisfies(s, constraints);
      }),
    reason: (spec) =>
      `no hand shape supports ${(spec.yaku ?? []).join(" + ")} together with the other constraints`,
  },
];

export interface SkeletonQuery {
  candidates: Skeleton[];
  /** Set when candidates is empty: which constraint emptied it. */
  reason?: string;
}

/**
 * Structural constraints are exactly invertible — they are looked up, never
 * searched. An empty result is a proof of impossibility, not a failed search.
 */
export function selectSkeletons(spec: GenerateSpec): SkeletonQuery {
  let candidates = allSkeletons();
  for (const filter of FILTERS) {
    if (!filter.applies(spec)) continue;
    const next = candidates.filter((s) => filter.keep(s, spec));
    if (!next.length) return { candidates: [], reason: filter.reason(spec) };
    candidates = next;
  }
  return { candidates };
}
