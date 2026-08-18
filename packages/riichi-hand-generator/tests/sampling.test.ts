import { describe, expect, it } from "vitest";
import { generate } from "../src/generate.js";
import { runStartsFor, type Domain } from "../src/plan.js";
import { candidateOrder, structuralWeights } from "../src/sampling.js";
import {
  DEFAULT_SAMPLING_CONFIG,
  resolveSamplingConfig,
  type OpenHandBaseYakuCategory,
  type OpenHandBaseYakuWeights,
} from "../src/sampling-config.js";
import { createRng } from "../src/rng.js";
import { selectSkeletons } from "../src/skeleton.js";

const domain: Domain = {
  suits: ["m", "p", "s"],
  minRank: 1,
  maxRank: 9,
  honorsAllowed: true,
  honorsOnly: false,
  greenOnly: false,
  requireHonor: false,
  pair: "any",
  avoidDuplicateRuns: false,
  forbiddenTriplets: [],
  forbiddenPairs: [],
};

const onlyBaseYaku = (
  category: OpenHandBaseYakuCategory,
): OpenHandBaseYakuWeights =>
  Object.fromEntries(
    Object.keys(DEFAULT_SAMPLING_CONFIG.openHandBaseYakuWeights).map((name) => [
      name,
      name === category ? 1 : 0,
    ]),
  ) as unknown as OpenHandBaseYakuWeights;

describe("structural sampling", () => {
  it("selects and reports a feasible base yaku for explicit open hands", () => {
    const result = generate(
      { closed: false },
      {
        seed: 7,
        sampling: { openHandBaseYakuWeights: onlyBaseYaku("tanyao") },
      },
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.hand.baseYakuCategory).toBe("tanyao");
    expect(result.hand.canonical.yaku.map((yaku) => yaku.name)).toContain(
      "tanyao",
    );
  });

  it("does not select a base yaku when openness was not requested", () => {
    const result = generate({}, { seed: 7, budget: 3_000 });
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.hand.baseYakuCategory).toBeUndefined();
    }
  });

  it("uses one non-pair wind triplet for the double-wind base", () => {
    const result = generate(
      { closed: false, roundWind: "west", seatWind: "west" },
      {
        seed: 11,
        budget: 3_000,
        sampling: { openHandBaseYakuWeights: onlyBaseYaku("double-wind") },
      },
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const names = result.hand.canonical.yaku.map((yaku) => yaku.name);
    expect(result.hand.baseYakuCategory).toBe("double-wind");
    expect(names).toContain("round-wind");
    expect(names).toContain("seat-wind");
    expect(result.hand.canonical.pair.tiles[0]).not.toBe("3z");
    expect(
      result.hand.canonical.groups.filter(
        (group) => group.tiles[0] === "3z",
      ),
    ).toHaveLength(1);
  });

  it("excludes double wind when round and seat constraints cannot overlap", () => {
    const result = generate(
      { closed: false, roundWind: "east", seatWind: "south" },
      {
        seed: 7,
        sampling: { openHandBaseYakuWeights: onlyBaseYaku("double-wind") },
      },
    );
    expect(result).toEqual({
      status: "unsatisfiable",
      reason:
        "no configured open-hand base yaku is feasible under these constraints",
    });
  });

  it("treats an empty exact yaku list as unrestricted generation", () => {
    for (let seed = 0; seed < 30; seed++) {
      const ordinary = generate({ closed: false }, { seed, budget: 3_000 });
      const atLeast = generate(
        { closed: false, yakuPolicy: "atLeast" },
        { seed, budget: 3_000 },
      );
      expect(ordinary).toEqual(atLeast);
    }
  });

  it("keeps interior and terminal run classes disjoint", () => {
    expect(
      runStartsFor({ kind: "run", called: false, edge: "simple" }, domain),
    ).toEqual([2, 3, 4, 5, 6]);
    expect(
      runStartsFor({ kind: "run", called: false, edge: "terminalRun" }, domain),
    ).toEqual([1, 7]);
  });

  it("encodes the 80/20 four-group prior and concrete pair support", () => {
    const spec = {
      yaku: ["menzen-tsumo" as const],
      yakuPolicy: "atLeast" as const,
    };
    const candidates = selectSkeletons(spec).candidates;
    const weights = structuralWeights(candidates, spec);
    const standard = candidates.filter(
      (candidate) => candidate.shape === "standard",
    );
    const standardMass = standard.reduce(
      (sum, candidate) => sum + weights.get(candidate)!,
      0,
    );
    const runMass = new Map<number, number>();
    const pairMass = new Map<string, number>();
    for (const candidate of standard) {
      const weight = weights.get(candidate)! / standardMass;
      const runs = candidate.blocks.filter(
        (block) => block.kind === "run",
      ).length;
      runMass.set(runs, (runMass.get(runs) ?? 0) + weight);
      pairMass.set(
        candidate.pair,
        (pairMass.get(candidate.pair) ?? 0) + weight,
      );
    }

    expect(runMass.get(0)).toBeCloseTo(0.0016, 6);
    expect(runMass.get(1)).toBeCloseTo(0.0256, 6);
    expect(runMass.get(2)).toBeCloseTo(0.1536, 6);
    expect(runMass.get(3)).toBeCloseTo(0.4096, 6);
    expect(runMass.get(4)).toBeCloseTo(0.4096, 6);
    expect(pairMass.get("plain")).toBeCloseTo(29.25 / 34, 6);
    expect(pairMass.get("yakuhai")).toBeCloseTo(4.5 / 34, 6);
    expect(pairMass.get("doubleWind")).toBeCloseTo(0.25 / 34, 6);
  });

  it("weights unconstrained win methods two-to-one toward ron", () => {
    const spec = { closed: false };
    const candidates = selectSkeletons(spec).candidates;
    const weights = structuralWeights(candidates, spec);
    const tsumoMass = candidates
      .filter((candidate) => candidate.tsumo)
      .reduce((sum, candidate) => sum + weights.get(candidate)!, 0);
    expect(tsumoMass).toBeCloseTo(1 / 3, 6);

    const custom = resolveSamplingConfig({
      winMethodWeights: { ron: 1, tsumo: 3 },
    });
    const customWeights = structuralWeights(candidates, spec, custom);
    const customTsumoMass = candidates
      .filter((candidate) => candidate.tsumo)
      .reduce((sum, candidate) => sum + customWeights.get(candidate)!, 0);
    expect(customTsumoMass).toBeCloseTo(3 / 4, 6);
  });

  it("creates a deterministic weighted order without removing support", () => {
    const spec = { fu: 40 };
    const candidates = selectSkeletons(spec).candidates;
    const first = candidateOrder(
      candidates,
      spec,
      DEFAULT_SAMPLING_CONFIG,
      createRng(17),
    );
    const second = candidateOrder(
      candidates,
      spec,
      DEFAULT_SAMPLING_CONFIG,
      createRng(17),
    );
    expect(first).toEqual(second);
    expect(new Set(first)).toEqual(new Set(candidates));
  });

  it("adds optional riichi only to eligible atLeast hands", () => {
    const spec = { yaku: ["pinfu" as const], yakuPolicy: "atLeast" as const };
    for (let seed = 0; seed < 30; seed++) {
      const required = generate(spec, {
        seed,
        sampling: { atLeastRiichiChance: 1 },
      });
      const forbidden = generate(spec, {
        seed,
        sampling: { atLeastRiichiChance: 0 },
      });
      expect(required.status).toBe("ok");
      expect(forbidden.status).toBe("ok");
      if (required.status !== "ok" || forbidden.status !== "ok") continue;
      expect(required.hand.canonical.yaku.map((yaku) => yaku.name)).toContain(
        "riichi",
      );
      expect(
        forbidden.hand.canonical.yaku.map((yaku) => yaku.name),
      ).not.toContain("riichi");
    }

    const open = generate(
      {
        yaku: ["tanyao"],
        yakuPolicy: "atLeast",
        closed: false,
      },
      { seed: 7, sampling: { atLeastRiichiChance: 1 } },
    );
    expect(open.status).toBe("ok");
    if (open.status === "ok") {
      expect(open.hand.canonical.yaku.map((yaku) => yaku.name)).not.toContain(
        "riichi",
      );
    }

    const exact = generate(
      { yaku: ["pinfu"] },
      { seed: 7, sampling: { atLeastRiichiChance: 1 } },
    );
    expect(exact.status).toBe("ok");
    if (exact.status === "ok") {
      expect(exact.hand.canonical.yaku.map((yaku) => yaku.name)).toEqual([
        "pinfu",
      ]);
    }
  });

  it("validates sampling options", () => {
    expect(() =>
      generate(
        { yaku: ["pinfu"], yakuPolicy: "atLeast" },
        { sampling: { atLeastRiichiChance: 1.1 } },
      ),
    ).toThrow(RangeError);
    expect(() =>
      generate(
        { fu: 30 },
        { sampling: { profile: "invalid" as "structural" } },
      ),
    ).toThrow(RangeError);
  });

  it("deeply merges sampling overrides without mutating the defaults", () => {
    const config = resolveSamplingConfig({
      atLeastRiichiChance: 0.5,
      winMethodWeights: { tsumo: 2 },
      groupWeights: { run: 3 },
      pairWeights: { differentWinds: { plain: 20 } },
      waitWeights: { interiorRun: { ryanmen: 8 } },
    });
    expect(config.atLeastRiichiChance).toBe(0.5);
    expect(config.winMethodWeights).toEqual({ ron: 2, tsumo: 2 });
    expect(config.groupWeights).toEqual({ run: 3, triplet: 1 });
    expect(config.pairWeights.differentWinds).toEqual({
      plain: 20,
      yakuhai: 5,
      doubleWind: 0,
    });
    expect(config.waitWeights.interiorRun).toEqual({
      ryanmen: 8,
      kanchan: 5,
      penchan: 0,
    });
    expect(DEFAULT_SAMPLING_CONFIG.groupWeights).toEqual({
      run: 4,
      triplet: 1,
    });
  });

  it("uses overridden weights in the structural prior", () => {
    const spec = {
      yaku: ["menzen-tsumo" as const],
      yakuPolicy: "atLeast" as const,
    };
    const candidates = selectSkeletons(spec).candidates;
    const config = resolveSamplingConfig({
      groupWeights: { run: 1, triplet: 1 },
    });
    const weights = structuralWeights(candidates, spec, config);
    const standard = candidates.filter(
      (candidate) => candidate.shape === "standard",
    );
    const standardMass = standard.reduce(
      (sum, candidate) => sum + weights.get(candidate)!,
      0,
    );
    const fourRunMass = standard
      .filter(
        (candidate) =>
          candidate.blocks.filter((block) => block.kind === "run").length === 4,
      )
      .reduce((sum, candidate) => sum + weights.get(candidate)!, 0);
    expect(fourRunMass / standardMass).toBeCloseTo(0.5 ** 4, 6);
  });

  it("accounts for optional riichi when filling an atLeast han target", () => {
    const withRiichi = generate(
      { yaku: ["pinfu"], yakuPolicy: "atLeast", han: 2 },
      {
        seed: 7,
        sampling: { atLeastRiichiChance: 1 },
        budget: 3_000,
      },
    );
    const withoutRiichi = generate(
      { yaku: ["pinfu"], yakuPolicy: "atLeast", han: 2 },
      {
        seed: 7,
        sampling: { atLeastRiichiChance: 0 },
        budget: 3_000,
      },
    );
    expect(withRiichi.status).toBe("ok");
    expect(withoutRiichi.status).toBe("ok");
    if (withRiichi.status !== "ok" || withoutRiichi.status !== "ok") return;
    expect(withRiichi.hand.canonical.han).toBe(2);
    expect(withRiichi.hand.canonical.yaku.map((yaku) => yaku.name)).toContain(
      "riichi",
    );
    expect(withoutRiichi.hand.canonical.han).toBe(2);
    expect(
      withoutRiichi.hand.canonical.yaku.map((yaku) => yaku.name),
    ).not.toContain("riichi");
  });

  it("produces the intended broad closed-tsumo distribution", () => {
    const counts = {
      total: 0,
      standard: 0,
      oneRun: 0,
      fourRuns: 0,
      terminalRuns: 0,
      interiorRuns: 0,
      simplePairs: 0,
      pinfu: 0,
      sanankou: 0,
      chanta: 0,
      riichi: 0,
    };
    for (let seed = 0; seed < 1_000; seed++) {
      const result = generate(
        { yaku: ["menzen-tsumo"], yakuPolicy: "atLeast" },
        { seed, budget: 3_000 },
      );
      expect(result.status).toBe("ok");
      if (result.status !== "ok") continue;
      counts.total++;
      const names = result.hand.canonical.yaku.map((yaku) => yaku.name);
      if (names.includes("pinfu")) counts.pinfu++;
      if (names.includes("sanankou")) counts.sanankou++;
      if (names.includes("chanta")) counts.chanta++;
      if (names.includes("riichi")) counts.riichi++;
      if (!result.hand.canonical.isStandardHand) continue;
      counts.standard++;
      const runs = result.hand.canonical.groups.filter(
        (group) => group.type === "run",
      );
      if (runs.length === 1) counts.oneRun++;
      if (runs.length === 4) counts.fourRuns++;
      for (const run of runs) {
        const start = Number(run.tiles[0][0]);
        if (start === 1 || start === 7) counts.terminalRuns++;
        else counts.interiorRuns++;
      }
      const pair = result.hand.canonical.pair.tiles[0];
      if (!pair.endsWith("z") && Number(pair[0]) >= 2 && Number(pair[0]) <= 8) {
        counts.simplePairs++;
      }
    }

    const runTotal = counts.terminalRuns + counts.interiorRuns;
    expect(counts.standard).toBeGreaterThan(990);
    expect(counts.oneRun / counts.standard).toBeLessThan(0.06);
    expect(counts.fourRuns / counts.standard).toBeGreaterThan(0.34);
    expect(counts.fourRuns / counts.standard).toBeLessThan(0.48);
    expect(counts.terminalRuns / runTotal).toBeGreaterThan(0.22);
    expect(counts.terminalRuns / runTotal).toBeLessThan(0.35);
    expect(counts.simplePairs / counts.standard).toBeGreaterThan(0.52);
    expect(counts.simplePairs / counts.standard).toBeLessThan(0.7);
    expect(counts.pinfu / counts.total).toBeGreaterThan(0.12);
    expect(counts.sanankou / counts.total).toBeLessThan(0.07);
    expect(counts.chanta / counts.total).toBeLessThan(0.03);
    expect(counts.riichi / counts.total).toBeGreaterThan(0.62);
    expect(counts.riichi / counts.total).toBeLessThan(0.78);
  });

  it(
    "keeps open-hand tsumo near the configured one-third prior",
    () => {
      let tsumo = 0;
      for (let seed = 0; seed < 300; seed++) {
        const result = generate({ closed: false }, { seed, budget: 3_000 });
        expect(result.status).toBe("ok");
        if (result.status !== "ok") continue;
        if (result.hand.handInput.winningTile.isTsumo) tsumo++;
        const names = result.hand.canonical.yaku.map((yaku) => yaku.name);
        expect(names).not.toContain("riichi");
        expect(names).not.toContain("menzen-tsumo");
      }
      expect(tsumo / 300).toBeGreaterThan(0.25);
      expect(tsumo / 300).toBeLessThan(0.42);
    },
    15_000,
  );
});
