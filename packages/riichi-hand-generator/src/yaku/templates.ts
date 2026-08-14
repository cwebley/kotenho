import type { WaitType, YakuName } from "riichi-score";
import type { HandShape, PairClass, Skeleton } from "../skeleton.js";

/**
 * Constraints a yaku places on the shape, checked before any tile exists.
 * Undefined means "don't care".
 */
export interface SkeletonConstraints {
  shape?: HandShape;
  /** Constrain the win method — menzen tsumo and haitei need a self-draw. */
  tsumo?: boolean;
  /** Every triplet/kan must be of simples — tanyao cannot use a yaochu block. */
  allSimpleBlocks?: boolean;
  /** Every non-run block is a terminal or honor triplet/kan. */
  allTerminalOrHonorBlocks?: boolean;
  /** Every run is 123 or 789. */
  allTerminalRuns?: boolean;
  /** A no-runs constraint may include chiitoitsu's seven-pair shape. */
  allowChiitoitsu?: boolean;
  allRuns?: boolean;
  noRuns?: boolean;
  minRuns?: number;
  minTriplets?: number;
  minConcealedTriplets?: number;
  kanCount?: number;
  menzen?: boolean;
  wait?: WaitType[];
  pair?: PairClass[];
}

/**
 * How a yaku narrows the tile domain before anything is placed. The spike
 * showed this is the difference between ~12% and ~61% acceptance — placers that
 * ignore each other collide constantly.
 */
export interface DomainConstraints {
  minRank?: number;
  maxRank?: number;
  honorsAllowed?: boolean;
  /** Lock every numbered tile to a single suit chosen at plan time. */
  singleSuit?: boolean;
  /** At least one honor must appear (honitsu). */
  requireHonor?: boolean;
  /** Every tile identity must be an honor. */
  honorsOnly?: boolean;
  /** Every tile identity must be one of ryuuiisou's green tiles. */
  greenOnly?: boolean;
  /** Restrict the pair independently of its fu class. */
  pair?: "yaochu" | "terminal" | "numbered";
}

export type PlacerKind =
  | "sanshoku"
  | "ittsuu"
  | "iipeiko"
  | "ryanpeikou"
  | "yakuhai"
  | "shousangen"
  | "daisangen"
  | "shousuushii"
  | "daisuushii"
  | "tsuuiisou"
  | "chuuren";

export interface YakuTemplate {
  name: YakuName;
  /** null = the yaku does not exist on an open hand. */
  han: { closed: number; open: number | null };
  /** Set for yakuman; the han field is then ignored for scoring. */
  limit?: boolean;
  skeleton?: SkeletonConstraints;
  domain?: DomainConstraints;
  /** Fixes specific blocks. Absent means the yaku needs no active placement. */
  placer?: PlacerKind;
  /**
   * The shape alone forces this yaku. Such skeletons are filtered OUT when the
   * yaku is not requested — the measurement that motivated it: sanankou and
   * suuankou were 65% of all contamination for a declared-only spec, and no
   * tile-level bias can help, because the shape decides it before any tile is
   * placed.
   */
  shapeGuarantees?: true;
  /** Comes from game state, never from tiles. */
  declared?: true;
  /**
   * Yaku this one replaces rather than stacks with. Requesting suuankou must
   * not exclude shapes on sanankou's behalf — four concealed triplets satisfies
   * both, and only the greater one scores.
   */
  subsumes?: YakuName[];
  /** True when the generator can deliberately produce it. */
  requestable: boolean;
  incompatibleWith?: YakuName[];
}

const T = (t: YakuTemplate): YakuTemplate => t;

/**
 * One record per yaku the scorer can emit. Three consumers read this table —
 * the skeleton filter, the tile planner, and the static feasibility engine — so
 * a wrong entry surfaces as a static false negative or a rejection-rate spike,
 * never as a wrong hand.
 *
 * `requestable: false` means the generator can *exclude* it but not aim at it.
 * Those specs are refused with a reason rather than searched for in vain.
 */
export const TEMPLATES: YakuTemplate[] = [
  // ── declared ──
  T({ name: "riichi", han: { closed: 1, open: null }, declared: true, requestable: true, skeleton: { menzen: true } }),
  T({ name: "double-riichi", han: { closed: 2, open: null }, declared: true, requestable: true, skeleton: { menzen: true }, incompatibleWith: ["riichi"] }),
  T({ name: "ippatsu", han: { closed: 1, open: null }, declared: true, requestable: true, skeleton: { menzen: true } }),
  T({ name: "haitei", han: { closed: 1, open: 1 }, declared: true, requestable: true, skeleton: { tsumo: true } }),
  T({ name: "houtei", han: { closed: 1, open: 1 }, declared: true, requestable: true, skeleton: { tsumo: false } }),
  T({ name: "rinshan-kaihou", han: { closed: 1, open: 1 }, declared: true, skeleton: { tsumo: true }, requestable: true, incompatibleWith: ["haitei", "houtei", "chankan", "tenhou", "chiihou"] }),
  T({ name: "chankan", han: { closed: 1, open: 1 }, declared: true, skeleton: { tsumo: false }, requestable: true, incompatibleWith: ["haitei", "houtei", "rinshan-kaihou", "tenhou", "chiihou"] }),
  T({ name: "tenhou", han: { closed: 0, open: null }, limit: true, declared: true, skeleton: { menzen: true, tsumo: true }, requestable: true, incompatibleWith: ["haitei", "houtei", "rinshan-kaihou", "chankan", "chiihou"] }),
  T({ name: "chiihou", han: { closed: 0, open: null }, limit: true, declared: true, skeleton: { menzen: true, tsumo: true }, requestable: true, incompatibleWith: ["haitei", "houtei", "rinshan-kaihou", "chankan", "tenhou"] }),

  // ── shape alone: satisfied by picking the right skeleton ──
  T({
    name: "menzen-tsumo",
    shapeGuarantees: true,
    han: { closed: 1, open: null },
    skeleton: { menzen: true, tsumo: true },
    requestable: true,
  }),
  T({
    name: "pinfu",
    shapeGuarantees: true,
    han: { closed: 1, open: null },
    skeleton: { allRuns: true, menzen: true, wait: ["ryanmen"], pair: ["plain"] },
    requestable: true,
    incompatibleWith: ["toitoi", "sanankou", "suuankou", "chiitoitsu", "sankantsu", "suukantsu", "honroutou", "chinroutou", "tsuuiisou"],
  }),
  T({
    name: "chiitoitsu",
    shapeGuarantees: true,
    han: { closed: 2, open: null },
    skeleton: { shape: "chiitoitsu" },
    requestable: true,
    incompatibleWith: ["pinfu", "toitoi", "sanankou", "ittsuu", "sanshoku", "iipeiko", "ryanpeikou"],
  }),
  T({
    name: "toitoi",
    shapeGuarantees: true,
    han: { closed: 2, open: 2 },
    skeleton: { noRuns: true, wait: ["shanpon", "tanki"] },
    requestable: true,
    incompatibleWith: ["pinfu", "sanshoku", "ittsuu", "iipeiko", "ryanpeikou", "chiitoitsu"],
  }),
  T({
    name: "sanankou",
    shapeGuarantees: true,
    han: { closed: 2, open: 2 },
    skeleton: { minConcealedTriplets: 3 },
    requestable: true,
    incompatibleWith: ["pinfu", "chiitoitsu"],
  }),
  T({
    name: "suuankou", subsumes: ["sanankou"],
    shapeGuarantees: true,
    han: { closed: 0, open: null },
    limit: true,
    skeleton: { noRuns: true, menzen: true, minConcealedTriplets: 4 },
    requestable: true,
    incompatibleWith: ["pinfu", "chiitoitsu", "sanankou"],
  }),
  T({ name: "sankantsu", shapeGuarantees: true, han: { closed: 2, open: 2 }, skeleton: { kanCount: 3 }, requestable: true, incompatibleWith: ["pinfu", "chiitoitsu"] }),
  T({ name: "suukantsu", subsumes: ["sankantsu"], shapeGuarantees: true, han: { closed: 0, open: 0 }, limit: true, skeleton: { kanCount: 4 }, requestable: true, incompatibleWith: ["pinfu", "chiitoitsu", "sankantsu"] }),

  // ── tile predicates ──
  T({
    name: "tanyao",
    han: { closed: 1, open: 1 },
    skeleton: { allSimpleBlocks: true, pair: ["plain"] },
    domain: { minRank: 2, maxRank: 8, honorsAllowed: false },
    requestable: true,
    // Anything needing a 1-2-3 or 7-8-9 run, or an honor, cannot be all simples.
    incompatibleWith: ["chanta", "junchan", "honroutou", "ittsuu", "chinroutou", "tsuuiisou", "honitsu", "kokushi-musou", "haku", "hatsu", "chun", "round-wind", "seat-wind", "daisangen", "shousangen", "shousuushii", "daisuushii", "ryuuiisou"],
  }),
  T({ name: "sanshoku", han: { closed: 2, open: 1 }, skeleton: { minRuns: 3 }, placer: "sanshoku", requestable: true, incompatibleWith: ["toitoi", "honitsu", "chinitsu", "chiitoitsu"] }),
  T({ name: "ittsuu", han: { closed: 2, open: 1 }, skeleton: { minRuns: 3 }, placer: "ittsuu", requestable: true, incompatibleWith: ["toitoi", "tanyao", "chiitoitsu", "chanta", "junchan"] }),
  T({ name: "iipeiko", han: { closed: 1, open: null }, skeleton: { minRuns: 2, menzen: true }, placer: "iipeiko", requestable: true, incompatibleWith: ["toitoi", "chiitoitsu", "ryanpeikou"] }),
  T({ name: "ryanpeikou", subsumes: ["iipeiko"], han: { closed: 3, open: null }, skeleton: { allRuns: true, menzen: true }, placer: "ryanpeikou", requestable: true, incompatibleWith: ["toitoi", "iipeiko", "chiitoitsu", "sanankou"] }),
  T({ name: "honitsu", han: { closed: 3, open: 2 }, domain: { singleSuit: true, requireHonor: true }, requestable: true, incompatibleWith: ["tanyao", "chinitsu", "sanshoku", "chinroutou", "junchan"] }),
  T({ name: "chinitsu", subsumes: ["honitsu"], han: { closed: 6, open: 5 }, domain: { singleSuit: true, honorsAllowed: false }, requestable: true, incompatibleWith: ["honitsu", "sanshoku", "tsuuiisou", "honroutou", "chanta", "haku", "hatsu", "chun", "round-wind", "seat-wind"] }),

  // ── yakuhai ──
  T({ name: "haku", han: { closed: 1, open: 1 }, skeleton: { minTriplets: 1 }, placer: "yakuhai", requestable: true, incompatibleWith: ["tanyao", "chinitsu", "pinfu"] }),
  T({ name: "hatsu", han: { closed: 1, open: 1 }, skeleton: { minTriplets: 1 }, placer: "yakuhai", requestable: true, incompatibleWith: ["tanyao", "chinitsu", "pinfu"] }),
  T({ name: "chun", han: { closed: 1, open: 1 }, skeleton: { minTriplets: 1 }, placer: "yakuhai", requestable: true, incompatibleWith: ["tanyao", "chinitsu", "pinfu"] }),
  T({ name: "round-wind", han: { closed: 1, open: 1 }, skeleton: { minTriplets: 1 }, placer: "yakuhai", requestable: true, incompatibleWith: ["tanyao", "chinitsu", "pinfu"] }),
  T({ name: "seat-wind", han: { closed: 1, open: 1 }, skeleton: { minTriplets: 1 }, placer: "yakuhai", requestable: true, incompatibleWith: ["tanyao", "chinitsu", "pinfu"] }),

  // ── terminal/honor families ──
  T({
    name: "chanta",
    han: { closed: 2, open: 1 },
    skeleton: { minRuns: 1, allTerminalOrHonorBlocks: true, allTerminalRuns: true },
    // No placer: the skeleton constraints plus `requireHonor` already describe
    // chanta exactly, and letting the assigner sample honors is what gives a
    // hand one, two or three honor groups instead of always the minimum one.
    domain: { requireHonor: true, pair: "yaochu" },
    requestable: true,
    incompatibleWith: ["tanyao", "junchan", "honroutou", "chinitsu", "toitoi", "chiitoitsu", "ittsuu"],
  }),
  T({
    name: "junchan",
    subsumes: ["chanta"],
    han: { closed: 3, open: 2 },
    skeleton: { minRuns: 1, allTerminalOrHonorBlocks: true, allTerminalRuns: true, pair: ["plain"] },
    domain: { honorsAllowed: false, pair: "terminal" },
    requestable: true,
    incompatibleWith: ["tanyao", "chanta", "honroutou", "honitsu", "toitoi", "chiitoitsu", "ittsuu", "haku", "hatsu", "chun", "round-wind", "seat-wind"],
  }),
  T({
    name: "honroutou",
    subsumes: ["chanta", "junchan"],
    han: { closed: 2, open: 2 },
    skeleton: { noRuns: true, allTerminalOrHonorBlocks: true },
    domain: { pair: "yaochu" },
    requestable: true,
    incompatibleWith: ["tanyao", "pinfu", "chanta", "junchan", "chinitsu"],
  }),

  // ── yakuman ──
  T({ name: "kokushi-musou", shapeGuarantees: true, skeleton: { shape: "kokushi" }, han: { closed: 0, open: null }, limit: true, requestable: true, incompatibleWith: ["tanyao", "pinfu", "chiitoitsu"] }),
  T({
    name: "daisangen",
    subsumes: ["shousangen"],
    han: { closed: 0, open: 0 },
    limit: true,
    skeleton: { minTriplets: 3 },
    placer: "daisangen",
    requestable: true,
    incompatibleWith: ["tanyao", "pinfu", "chinitsu"],
  }),
  T({
    name: "shousangen",
    han: { closed: 2, open: 2 },
    skeleton: { minTriplets: 2, pair: ["yakuhai"] },
    placer: "shousangen",
    requestable: true,
    incompatibleWith: ["tanyao", "pinfu", "chinitsu", "daisangen"],
  }),
  T({
    name: "shousuushii",
    han: { closed: 0, open: 0 },
    limit: true,
    skeleton: { minTriplets: 3 },
    placer: "shousuushii",
    requestable: true,
    incompatibleWith: ["tanyao", "pinfu", "chinitsu", "daisuushii"],
  }),
  T({
    name: "daisuushii",
    subsumes: ["shousuushii"],
    han: { closed: 0, open: 0 },
    limit: true,
    skeleton: { minTriplets: 4, pair: ["plain"] },
    domain: { pair: "numbered" },
    placer: "daisuushii",
    requestable: true,
    incompatibleWith: ["tanyao", "pinfu", "chinitsu", "shousuushii"],
  }),
  T({
    name: "tsuuiisou",
    han: { closed: 0, open: 0 },
    limit: true,
    skeleton: { noRuns: true, allowChiitoitsu: true },
    domain: { honorsOnly: true },
    placer: "tsuuiisou",
    requestable: true,
    incompatibleWith: ["tanyao", "pinfu", "chinitsu"],
  }),
  T({
    name: "chinroutou",
    han: { closed: 0, open: 0 },
    limit: true,
    skeleton: { noRuns: true, allTerminalOrHonorBlocks: true, pair: ["plain"] },
    domain: { honorsAllowed: false, pair: "terminal" },
    requestable: true,
    incompatibleWith: ["tanyao", "pinfu", "honitsu"],
  }),
  T({
    name: "ryuuiisou",
    han: { closed: 0, open: 0 },
    limit: true,
    skeleton: { shape: "standard", allSimpleBlocks: true, pair: ["plain"] },
    domain: { greenOnly: true },
    requestable: true,
    incompatibleWith: ["tanyao", "pinfu"],
  }),
  T({
    name: "chuuren-poutou",
    han: { closed: 0, open: null },
    limit: true,
    skeleton: { shape: "standard", menzen: true, kanCount: 0 },
    domain: { singleSuit: true, honorsAllowed: false },
    placer: "chuuren",
    requestable: true,
    incompatibleWith: ["tanyao", "chiitoitsu", "honitsu"],
  }),
];

const BY_NAME = new Map(TEMPLATES.map((t) => [t.name, t]));

export const templateFor = (name: YakuName): YakuTemplate | undefined =>
  BY_NAME.get(name);

/** Does this skeleton satisfy every shape constraint the yaku imposes? */
export function skeletonSatisfies(
  skeleton: Skeleton,
  constraints: SkeletonConstraints,
): boolean {
  const runs = skeleton.blocks.filter((b) => b.kind === "run").length;
  const triplets = skeleton.blocks.filter((b) => b.kind !== "run").length;
  if (constraints.shape && skeleton.shape !== constraints.shape) return false;
  if (constraints.shape === undefined && skeleton.shape !== "standard") {
    // Shape-specific yaku aside, every other constraint assumes blocks exist.
    if (
        constraints.allRuns ||
        constraints.allTerminalOrHonorBlocks ||
        constraints.allTerminalRuns ||
        (constraints.noRuns &&
          !(skeleton.shape === "chiitoitsu" && constraints.allowChiitoitsu)) ||
      constraints.minRuns !== undefined ||
      constraints.minTriplets !== undefined ||
      constraints.minConcealedTriplets !== undefined ||
      constraints.kanCount !== undefined
    ) {
      return false;
    }
  }
  if (
    constraints.allSimpleBlocks &&
    skeleton.blocks.some((b) => b.edge !== "simple")
  ) {
    return false;
  }
  if (
    constraints.allTerminalOrHonorBlocks &&
    skeleton.blocks.some(
      (block) => block.kind !== "run" && block.edge !== "terminalOrHonor",
    )
  ) {
    return false;
  }
  if (
    constraints.allTerminalRuns &&
    skeleton.blocks.some(
      (block) => block.kind === "run" && block.edge !== "terminalRun",
    )
  ) {
    return false;
  }
  if (constraints.allRuns && runs !== 4) return false;
  if (constraints.noRuns && runs !== 0) return false;
  if (constraints.minRuns !== undefined && runs < constraints.minRuns) return false;
  if (constraints.minTriplets !== undefined && triplets < constraints.minTriplets) return false;
  if (
    constraints.minConcealedTriplets !== undefined &&
    skeleton.concealedTriplets < constraints.minConcealedTriplets
  ) {
    return false;
  }
  if (constraints.kanCount !== undefined && skeleton.kanCount !== constraints.kanCount) return false;
  if (constraints.menzen !== undefined && skeleton.menzen !== constraints.menzen) return false;
  if (constraints.tsumo !== undefined && skeleton.tsumo !== constraints.tsumo) return false;
  if (constraints.wait && !constraints.wait.includes(skeleton.wait)) return false;
  if (constraints.pair && !constraints.pair.includes(skeleton.pair)) return false;
  return true;
}
