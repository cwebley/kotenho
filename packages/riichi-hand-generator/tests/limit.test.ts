import { describe, expect, it } from "vitest";
import type { Limit, RulesetOptions } from "riichi-score";
import { generate } from "../src/generate.js";
import type { GenerateSpec } from "../src/types.js";

/** Every local double-yakuman variant on, so both forms are reachable. */
const DOUBLES: RulesetOptions = {
  doubleYakuman: {
    daisuushii: true,
    kokushi13Wait: true,
    suuankouTanki: true,
    junseiChuuren: true,
  },
};

const limits = (spec: GenerateSpec, count = 24, seed = 21): Set<Limit | "none"> => {
  const result = generate(spec, { count, seed, budget: 60000 });
  if (result.status !== "ok" && result.status !== "shortfall") {
    throw new Error(
      `expected hands, got ${result.status}: ${"reason" in result ? result.reason : ""}`,
    );
  }
  expect(result.hands.length).toBeGreaterThan(0);
  return new Set(result.hands.map((hand) => hand.canonical.limit ?? "none"));
};

describe("chuuren reaches both forms", () => {
  it("no longer produces only the pure shape", () => {
    // Holding 1112345678999 and winning anything is junsei every time. Drawing
    // the duplicate and the winning tile independently is what unlocks the
    // ordinary single yakuman.
    expect(limits({ yaku: ["chuuren-poutou"], ruleset: DOUBLES }, 40)).toEqual(
      new Set(["yakuman", "double-yakuman"]),
    );
  });

  it("keeps the thirteen closed tiles a legal tenpai hand in both forms", () => {
    const result = generate(
      { yaku: ["chuuren-poutou"], ruleset: DOUBLES },
      { count: 30, seed: 21, budget: 60000 },
    );
    if (result.status !== "ok" && result.status !== "shortfall") throw new Error(result.status);
    for (const hand of result.hands) {
      expect(hand.handInput.closedTiles).toHaveLength(13);
      const suits = new Set(
        [...hand.handInput.closedTiles, hand.handInput.winningTile.tile].map(
          (tile) => tile[1],
        ),
      );
      expect(suits.size).toBe(1);
      expect(hand.canonical.yaku.map((yaku) => yaku.name)).toContain(
        "chuuren-poutou",
      );
    }
  });
});

describe("chuuren has no intended reading to compare", () => {
  const diagnoses = (spec: GenerateSpec): Record<string, number> => {
    const seen: Record<string, number> = {};
    generate(spec, {
      count: 15,
      seed: 6,
      budget: 40000,
      onAttempt: (record) => {
        if (record.diagnosis) seen[record.diagnosis] = (seen[record.diagnosis] ?? 0) + 1;
      },
    });
    return seen;
  };

  it("reports not-aimed rather than a false coverage-shadow", () => {
    // Nine gates is assigned as a whole multiset, so the planner forms no
    // grouping. Fabricating one made every hand look like the scorer had lost
    // our reading, which is what coverage-shadow is supposed to mean.
    const seen = diagnoses({ yaku: ["chuuren-poutou"], ruleset: DOUBLES });
    expect(Object.keys(seen)).toEqual(["not-aimed"]);
  });

  it("leaves every other shape aiming as before", () => {
    for (const spec of [
      { yaku: ["kokushi-musou"], ruleset: DOUBLES },
      { handShape: "chiitoitsu" } as GenerateSpec,
      { yaku: ["suuankou"], ruleset: DOUBLES },
      { yaku: ["riichi", "pinfu"], closed: true } as GenerateSpec,
    ]) {
      const seen = diagnoses(spec as GenerateSpec);
      expect(seen["not-aimed"]).toBeUndefined();
      expect(seen.matched).toBeGreaterThan(0);
    }
  });

  it("keeps coverage-shadow meaningful where it genuinely fires", () => {
    const seen = diagnoses({ han: 8, dora: 3, closed: true });
    expect(seen["coverage-shadow"]).toBeGreaterThan(0);
    expect(seen["not-aimed"]).toBeUndefined();
  });
});

describe("limit selects between a yakuman's forms", () => {
  const cases: [string, GenerateSpec][] = [
    ["chuuren-poutou", { yaku: ["chuuren-poutou"], ruleset: DOUBLES }],
    ["kokushi-musou", { yaku: ["kokushi-musou"], ruleset: DOUBLES }],
    ["suuankou", { yaku: ["suuankou"], ruleset: DOUBLES }],
  ];
  for (const [name, base] of cases) {
    it(`forces either form of ${name}`, () => {
      expect(limits({ ...base, limit: "double-yakuman" })).toEqual(
        new Set(["double-yakuman"]),
      );
      expect(limits({ ...base, limit: "yakuman" })).toEqual(
        new Set(["yakuman"]),
      );
    });
  }
});

describe("kokushi wait types", () => {
  it("uses the scorer's own vocabulary, so waitType is a working lever", () => {
    expect(
      limits({ yaku: ["kokushi-musou"], ruleset: DOUBLES, waitType: "kokushi-wide" }),
    ).toEqual(new Set(["double-yakuman"]));
    expect(
      limits({ yaku: ["kokushi-musou"], ruleset: DOUBLES, waitType: "kokushi-single" }),
    ).toEqual(new Set(["yakuman"]));
  });

  it("proves tanki impossible for kokushi rather than exhausting", () => {
    // The scorer never reports "tanki" for kokushi, so this is a real proof.
    const result = generate(
      { yaku: ["kokushi-musou"], waitType: "tanki" },
      { seed: 3, budget: 4000 },
    );
    expect(result.status).toBe("unsatisfiable");
  });

  it("leaves chiitoitsu's tanki alone", () => {
    const result = generate(
      { handShape: "chiitoitsu", waitType: "tanki" },
      { seed: 3, budget: 8000 },
    );
    expect(result.status).toBe("ok");
  });
});

describe("limit static feasibility", () => {
  const impossible: [string, GenerateSpec, RegExp][] = [
    [
      "doubling flag off",
      { yaku: ["chuuren-poutou"], limit: "double-yakuman" },
      /enable ruleset\.doubleYakuman\.junseiChuuren/,
    ],
    [
      "yakuman with no doubled form",
      { yaku: ["daisangen"], limit: "double-yakuman", ruleset: DOUBLES },
      /cannot reach double-yakuman/,
    ],
    [
      "no yakuman in an exact list",
      { yaku: ["tanyao"], limit: "yakuman" },
      /requires a yakuman/,
    ],
    [
      "one yakuman cannot reach triple",
      { yaku: ["suuankou"], limit: "triple-yakuman", ruleset: DOUBLES },
      /cannot reach triple-yakuman/,
    ],
  ];

  for (const [label, spec, reason] of impossible) {
    it(`proves ${label} impossible`, () => {
      const result = generate(spec, { seed: 1, budget: 400 });
      expect(result.status).toBe("unsatisfiable");
      if (result.status === "unsatisfiable") expect(result.reason).toMatch(reason);
    });
  }

  it("survives a soundness challenge on every claim", () => {
    // An unsatisfiable verdict is a proof, so disable the inferred claims and
    // give the search 50,000 attempts to produce a counterexample.
    for (const [label, spec] of impossible.map(
      ([label, spec]) => [label, spec] as const,
    )) {
      const challenge = generate(spec, {
        seed: 99,
        budget: 50000,
        __unsafeSkipInferredChecks: true,
      });
      expect(challenge.status, `${label} was called impossible`).not.toBe("ok");
    }
  }, 60_000);

  it("declines to decide when an unrequested yakuman could stack", () => {
    // Under atLeast a second yakuman may turn up and lift the multiplier, so
    // nothing is decidable up front.
    const result = generate(
      {
        yaku: ["daisangen"],
        yakuPolicy: "atLeast",
        limit: "double-yakuman",
        ruleset: DOUBLES,
      },
      { seed: 5, budget: 40000 },
    );
    expect(result.status).toBe("ok");
  });

  it("declines to decide with no yaku list at all", () => {
    const result = generate(
      { limit: "yakuman", ruleset: DOUBLES },
      { seed: 5, budget: 40000 },
    );
    expect(result.status).toBe("ok");
  });
});
