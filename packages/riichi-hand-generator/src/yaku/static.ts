import type { YakuName } from "riichi-score";
import type { GenerateSpec } from "../types.js";
import { templateFor, type YakuTemplate } from "./templates.js";

export interface Feasibility {
  ok: boolean;
  reason?: string;
}

const ok: Feasibility = { ok: true };
const no = (reason: string): Feasibility => ({ ok: false, reason });

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
  if (spec.riichi) {
    forced.push({ name: "riichi", why: "the riichi flag is set" });
  }
  if (spec.ippatsu) {
    forced.push({ name: "ippatsu", why: "the ippatsu flag is set" });
  }
  return forced;
}

/**
 * Everything decidable about a yaku set without touching a tile. Returns a
 * proof of impossibility with a reason an author can act on, not a timeout.
 */
export function checkYakuFeasibility(spec: GenerateSpec): Feasibility {
  const requested = spec.yaku ?? [];
  const exact = (spec.yakuPolicy ?? "exact") === "exact";

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

  // Declared prerequisites.
  if (requested.includes("ippatsu") && !requested.includes("riichi") && !requested.includes("double-riichi")) {
    return no("ippatsu requires riichi");
  }

  if (exact) {
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

  return ok;
}

/** Yaku the situation forces, so the planner can request them implicitly. */
export function impliedYaku(spec: GenerateSpec): YakuName[] {
  return forcedYaku(spec).map((f) => f.name);
}
