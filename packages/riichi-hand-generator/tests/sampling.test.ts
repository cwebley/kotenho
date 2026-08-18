import { describe, expect, it } from "vitest";
import { generate } from "../src/generate.js";
import { runStartsFor, type Domain } from "../src/plan.js";
import { candidateOrder, structuralWeights } from "../src/sampling.js";
import {
  DEFAULT_SAMPLING_CONFIG,
  resolveSamplingConfig,
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
};

describe("structural sampling", () => {
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
      groupWeights: { run: 3 },
      pairWeights: { differentWinds: { plain: 20 } },
      waitWeights: { interiorRun: { ryanmen: 8 } },
    });
    expect(config.atLeastRiichiChance).toBe(0.5);
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
});
