import { createRuleset, type Direction, type Ruleset, type YakuName } from "riichi-score";
import type { GenerateSpec, WindConstraint } from "../types.js";
import { templateFor, type YakuTemplate } from "./templates.js";

export interface Feasibility {
  ok: boolean;
  reason?: string;
}

const ok: Feasibility = { ok: true };
const no = (reason: string): Feasibility => ({ ok: false, reason });
const DIRECTIONS: Direction[] = ["east", "south", "west", "north"];

function checkWindConstraint(
  name: "roundWind" | "seatWind",
  constraint: WindConstraint | undefined,
): Feasibility {
  if (constraint === undefined) return ok;
  const values = Array.isArray(constraint) ? constraint : [constraint];
  if (!values.length || values.some((wind) => !DIRECTIONS.includes(wind))) {
    return no(`${name} must be a direction or a non-empty array of directions`);
  }
  return ok;
}

export interface DeclaredGameState {
  isRiichi: boolean;
  isDoubleRiichi: boolean;
  isIppatsu: boolean;
  isHaitei: boolean;
  isHoutei: boolean;
  ruleset: Ruleset;
}

/**
 * Declared yaku are facts about the simulated winning situation. They are
 * derived only from the requested yaku so the scorer, dora planner and
 * exclusivity verifier all describe the same hand.
 */
export function declaredGameState(spec: GenerateSpec): DeclaredGameState {
  const requested = new Set(spec.yaku ?? []);
  return {
    isRiichi: requested.has("riichi"),
    isDoubleRiichi: requested.has("double-riichi"),
    isIppatsu: requested.has("ippatsu"),
    isHaitei: requested.has("haitei"),
    isHoutei: requested.has("houtei"),
    ruleset: createRuleset(spec.ruleset),
  };
}

export function hasRiichi(state: DeclaredGameState): boolean {
  return state.isRiichi || state.isDoubleRiichi;
}

/**
 * Yaku forced by the situation rather than chosen. Under an exact policy a
 * spec that triggers one without listing it is contradictory, and the search
 * would never find a hand — so this is decided before any search begins.
 */
function forcedYaku(spec: GenerateSpec): { name: YakuName; why: string }[] {
  const forced: { name: YakuName; why: string }[] = [];
  const closed = spec.closed ?? spec.openMeldCount === 0;

  if (spec.winMethod === "tsumo" && closed === true) {
    forced.push({
      name: "menzen-tsumo",
      why: "a concealed hand won by tsumo always has menzen tsumo",
    });
  }
  return forced;
}

/**
 * Everything decidable about a yaku set without touching a tile. Returns a
 * proof of impossibility with a reason an author can act on, not a timeout.
 */
export function checkYakuFeasibility(spec: GenerateSpec): Feasibility {
  const roundWindCheck = checkWindConstraint("roundWind", spec.roundWind);
  if (!roundWindCheck.ok) return roundWindCheck;
  const seatWindCheck = checkWindConstraint("seatWind", spec.seatWind);
  if (!seatWindCheck.ok) return seatWindCheck;

  const requested = spec.yaku ?? [];
  const exact = (spec.yakuPolicy ?? "exact") === "exact";
  const ruleset = createRuleset(spec.ruleset);

  const templates: YakuTemplate[] = [];
  for (const name of requested) {
    const template = templateFor(name);
    if (!template) return no(`unknown yaku: ${name}`);
    if (!template.requestable) {
      return no(
        `${name} can be excluded but not requested yet — the generator has no way to construct it deliberately`,
      );
    }
    templates.push(template);
  }

  // Pairwise incompatibility, read straight off the table.
  for (const template of templates) {
    for (const other of requested) {
      if (other === template.name) continue;
      if (template.incompatibleWith?.includes(other)) {
        return no(`${template.name} and ${other} cannot occur in the same hand`);
      }
    }
  }

  // Closed-only yaku against an open hand.
  const wantsOpen =
    spec.closed === false ||
    (spec.openMeldCount !== undefined && spec.openMeldCount > 0);
  if (wantsOpen) {
    const closedOnly = templates.find((t) => t.han.open === null);
    if (closedOnly) {
      return no(`${closedOnly.name} only exists on a concealed hand`);
    }
  }
  if (wantsOpen && requested.includes("tanyao") && !ruleset.openTanyao) {
    return no("tanyao is disabled for open hands by this ruleset");
  }

  // Declared prerequisites.
  if (requested.includes("ippatsu") && !requested.includes("riichi") && !requested.includes("double-riichi")) {
    return no("ippatsu requires riichi");
  }

  // Only meaningful when the caller actually pinned a yaku list. With no list
  // there is nothing to be exhaustive about, and "closed tsumo" is an ordinary
  // spec rather than a contradiction.
  if (exact && requested.length) {
    if (requested.includes("honroutou") && !requested.includes("toitoi")) {
      return no(
        "honroutou has no runs, so its standard-hand construction also scores toitoi — an exact yaku list must include toitoi",
      );
    }
    if (requested.includes("shousangen")) {
      const dragons = requested.filter((name) =>
        (["haku", "hatsu", "chun"] as YakuName[]).includes(name),
      );
      if (dragons.length !== 2) {
        return no(
          "shousangen has two dragon triplets, so an exact yaku list must include exactly two of haku, hatsu and chun",
        );
      }
    }
    for (const { name, why } of forcedYaku(spec)) {
      if (!requested.includes(name)) {
        return no(
          `${why}, so an exact yaku list must include ${name} — or change the win method`,
        );
      }
    }
    // A yakuman suppresses ordinary yaku, so listing both is contradictory.
    const limits = templates.filter((t) => t.limit);
    if (limits.length && templates.length > limits.length) {
      return no(
        `${limits[0].name} is a yakuman and suppresses ordinary yaku, so it cannot be combined with them`,
      );
    }
  }

  const doraCheck = checkDoraFeasibility(spec, templates);
  if (!doraCheck.ok) return doraCheck;

  return ok;
}

/**
 * han = yaku han + dora + ura. With the yaku set pinned, the dora requirement
 * is a subtraction rather than a search — which makes several impossibilities
 * decidable without touching a tile.
 */
function checkDoraFeasibility(
  spec: GenerateSpec,
  templates: YakuTemplate[],
): Feasibility {
  const riichiDeclared = hasRiichi(declaredGameState(spec));

  if ((spec.uraDora ?? 0) > 0 && !riichiDeclared) {
    return no(
      "ura dora requires riichi — the ura indicators are only revealed to a player who declared it",
    );
  }
  if ((spec.dora ?? 0) < 0 || (spec.uraDora ?? 0) < 0 || (spec.akaDora ?? 0) < 0) {
    return no("dora counts cannot be negative");
  }
  if (!Number.isInteger(spec.akaDora ?? 0)) return no("aka dora count must be an integer");
  if ((spec.akaDora ?? 0) > Object.values(createRuleset(spec.ruleset).akaDora).reduce((sum, n) => sum + n, 0)) {
    return no("aka dora count exceeds this ruleset's red-five supply");
  }

  const slots = spec.doraIndicatorCount ?? 1;
  if (!Number.isInteger(slots) || slots < 1 || slots > 5) {
    return no("dora indicator count must be an integer from 1 to 5");
  }

  if (spec.han === undefined || !templates.length) return ok;
  // A yakuman scores by limit rather than han, so the equation does not apply.
  if (templates.some((t) => t.limit)) return ok;
  if ((spec.yakuPolicy ?? "exact") !== "exact") return ok;

  const openIsOpen =
    spec.closed === false || (spec.openMeldCount ?? 0) > 0;
  const openIsClosed =
    spec.closed === true ||
    spec.openMeldCount === 0 ||
    templates.some((t) => t.han.open === null);

  const closedTotal = templates.reduce((sum, t) => sum + t.han.closed, 0);
  const openTotal = templates.reduce((sum, t) => sum + (t.han.open ?? 0), 0);

  // When openness is not pinned the yaku total is one of two values. That is
  // still enough to prove impossibility whenever the target is below both.
  const possibleTotals = openIsOpen
    ? [openTotal]
    : openIsClosed
      ? [closedTotal]
      : [...new Set([closedTotal, openTotal])];

  if (possibleTotals.every((total) => spec.han! < total)) {
    const lowest = Math.min(...possibleTotals);
    return no(
      `${(spec.yaku ?? []).join(" + ")} is at least ${lowest} han, so a total of ${spec.han} is impossible`,
    );
  }
  if (possibleTotals.length !== 1) return ok;
  const yakuHan = possibleTotals[0];

  const needed = spec.han - yakuHan;
  if (
    (spec.dora !== undefined || spec.uraDora !== undefined || spec.akaDora !== undefined) &&
    (spec.dora ?? 0) + (spec.uraDora ?? 0) + (spec.akaDora ?? 0) !== needed
  ) {
    return no(
      `${(spec.yaku ?? []).join(" + ")} is ${yakuHan} han, so reaching ${spec.han} needs ${needed} dora, not ${(spec.dora ?? 0) + (spec.uraDora ?? 0) + (spec.akaDora ?? 0)}`,
    );
  }
  if (needed > 4 * (slots + (riichiDeclared ? slots : 0))) {
    return no(
      `reaching ${spec.han} han needs ${needed} dora, which ${slots} indicator(s) cannot supply`,
    );
  }
  return ok;
}

/**
 * Dora the spec requires beyond the yaku, when that is determinable.
 *
 * `open` is the caller's knowledge of the hand being built. Most yaku are worth
 * one han less open, so inferring it from the spec alone charges every skeleton
 * the closed price: `{ yaku: ["chanta"], han: 3 }` asked for one dora, which no
 * open skeleton could ever satisfy, and open skeletons are the majority of the
 * chanta space. Pass the skeleton's own `menzen` wherever one exists.
 */
export function requiredDora(
  spec: GenerateSpec,
  open?: boolean,
): { dora: number; ura: number; aka: number; flexibleBonus: number } | null {
  if (spec.dora !== undefined || spec.uraDora !== undefined || spec.akaDora !== undefined) {
    return {
      dora: spec.dora ?? 0,
      ura: spec.uraDora ?? 0,
      aka: spec.akaDora ?? 0,
      flexibleBonus: 0,
    };
  }
  if (spec.han === undefined) return null;
  const templates = (spec.yaku ?? [])
    .map((name) => templateFor(name))
    .filter((t): t is YakuTemplate => Boolean(t));
  if (!templates.length || templates.some((t) => t.limit)) return null;
  const isOpen =
    open ??
    (spec.closed === false ||
      (spec.openMeldCount !== undefined && spec.openMeldCount > 0));
  const yakuHan = templates.reduce(
    (sum, t) => sum + (isOpen ? (t.han.open ?? 0) : t.han.closed),
    0,
  );
  const needed = spec.han - yakuHan;
  if (needed < 0) return null;
  return {
    dora: needed,
    ura: 0,
    aka: 0,
    // A bare han target asks for total bonus han, not a particular dora source.
    // Search samples omote, ura (when riichi reveals it), and aka later.
    flexibleBonus: needed,
  };
}

/** Yaku the situation forces, so the planner can request them implicitly. */
export function impliedYaku(spec: GenerateSpec): YakuName[] {
  return forcedYaku(spec).map((f) => f.name);
}
