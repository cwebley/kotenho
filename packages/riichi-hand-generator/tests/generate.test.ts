import { describe, expect, it } from "vitest";
import { calculate } from "riichi-score";
import { generate } from "../src/generate.js";
import { allSkeletons, selectSkeletons } from "../src/skeleton.js";
import type { GenerateSpec } from "../src/types.js";

describe("skeleton space", () => {
  it("is small enough to enumerate and index", () => {
    const skeletons = allSkeletons();
    expect(skeletons.length).toBeGreaterThan(1000);
    expect(skeletons.length).toBeLessThan(100_000);
  });

  it("inverts fu exactly: closed ron at 30 fu is only ever pinfu", () => {
    const { candidates } = selectSkeletons({
      fu: 30,
      closed: true,
      winMethod: "ron",
    });
    expect(candidates.length).toBeGreaterThan(0);
    // 20 base + 10 menzen ron leaves no room for any other fu source, so the
    // shape is forced: four runs, plain pair, ryanmen wait.
    for (const skeleton of candidates) {
      expect(skeleton.pinfuShape).toBe(true);
      expect(skeleton.wait).toBe("ryanmen");
      expect(skeleton.blocks.every((block) => block.kind === "run")).toBe(true);
    }
  });

  it("proves impossible specs impossible instead of searching", () => {
    // Anything above 20 base + 10 menzen ron rounds past 20.
    expect(generate({ fu: 20, closed: true, winMethod: "ron" }).status).toBe(
      "unsatisfiable",
    );
    // 30 fu closed ron forces pinfu, and pinfu forces a ryanmen wait.
    expect(
      generate({ fu: 30, closed: true, winMethod: "ron", waitType: "kanchan" })
        .status,
    ).toBe("unsatisfiable");
    expect(generate({ kanCount: 5 }).status).toBe("unsatisfiable");
  });

  it("does not call 25 fu impossible — that is chiitoitsu", () => {
    // Soundness: an "unsatisfiable" verdict is a proof, so a shape missing from
    // the model must never turn into a false impossibility claim.
    const result = generate({ fu: 25 }, { seed: 3 });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.hand.canonical.fu).toBe(25);
    expect(
      result.hand.canonical.yaku.map((yaku) => yaku.name),
    ).toContain("chiitoitsu");
  });

  it("gives a reason a lesson author can act on", () => {
    const result = generate({ kanCount: 5 });
    expect(result.status).toBe("unsatisfiable");
    if (result.status !== "unsatisfiable") return;
    expect(result.reason).toContain("kan");
  });
});

describe("generate", () => {
  const specs: [string, GenerateSpec][] = [
    ["30 fu closed ron", { fu: 30, closed: true, winMethod: "ron" }],
    ["40 fu closed ron", { fu: 40, closed: true, winMethod: "ron" }],
    ["50 fu with one kan", { fu: 50, kanCount: 1 }],
    ["40 fu kanchan", { fu: 40, waitType: "kanchan" }],
    ["dealer 40 fu", { fu: 40, roundWind: "east", seatWind: "east" }],
    ["one called meld", { fu: 30, openMeldCount: 1 }],
    ["tsumo, 40 fu", { fu: 40, winMethod: "tsumo" }],
    ["chiitoitsu", { handShape: "chiitoitsu" }],
    ["25 fu", { fu: 25 }],
  ];

  for (const [label, spec] of specs) {
    it(`satisfies: ${label}`, () => {
      const result = generate(spec, { seed: 7 });
      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      const { canonical, handInput } = result.hand;
      if (spec.fu !== undefined) expect(canonical.fu).toBe(spec.fu);
      if (spec.waitType !== undefined) {
        expect(canonical.waitType).toBe(spec.waitType);
      }
      if (spec.winMethod !== undefined) {
        expect(Boolean(handInput.winningTile.isTsumo)).toBe(
          spec.winMethod === "tsumo",
        );
      }
      if (spec.openMeldCount !== undefined) {
        const called = (handInput.openMelds ?? []).filter(
          (meld) => meld.type !== "ankan",
        );
        expect(called).toHaveLength(spec.openMeldCount);
      }
    });
  }

  it("is deterministic for a given seed and varies across seeds", () => {
    const signature = (spec: GenerateSpec, seed: number): string => {
      const result = generate(spec, { seed });
      if (result.status !== "ok") return `not-ok:${result.status}`;
      return (
        [...result.hand.handInput.closedTiles].sort().join("") +
        result.hand.handInput.winningTile.tile
      );
    };
    expect(signature({ fu: 40 }, 123)).toBe(signature({ fu: 40 }, 123));
    expect(signature({ fu: 40 }, 123)).not.toBe(signature({ fu: 40 }, 124));
  });

  it("produces materially different hands across seeds", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const result = generate({ fu: 40, closed: true }, { seed });
      if (result.status !== "ok") continue;
      seen.add([...result.hand.handInput.closedTiles].sort().join(""));
    }
    expect(seen.size).toBeGreaterThan(30);
  });

  /**
   * The always-on invariant: every hand we hand back is re-scored from its own
   * handInput and must still satisfy the spec. This is the guard that makes a
   * buggy planner cost throughput rather than correctness.
   */
  it("re-verifies every generated hand against its spec", () => {
    for (const [, spec] of specs) {
      for (let seed = 0; seed < 25; seed++) {
        const result = generate(spec, { seed });
        if (result.status !== "ok") continue;
        const rescored = calculate(result.hand.handInput);
        expect(rescored.valid).toBe(true);
        const best = rescored.handInterpretations[0].basicPoints;
        const tied = rescored.handInterpretations.filter(
          (hi) => hi.basicPoints === best,
        );
        if (spec.fu !== undefined) {
          for (const hi of tied) expect(hi.fu).toBe(spec.fu);
        }
        if (spec.waitType !== undefined) {
          for (const hi of tied) expect(hi.waitType).toBe(spec.waitType);
        }
      }
    }
  });

  it("treats an attempt sink as an observer", () => {
    // The sink must never consume the RNG or touch generator state, so
    // attaching one cannot change what a given seed produces.
    const signature = (withSink: boolean): string => {
      const seen: string[] = [];
      const result = generate(
        { fu: 40, closed: true },
        withSink
          ? { seed: 99, onAttempt: (record) => seen.push(record.skeletonId) }
          : { seed: 99 },
      );
      if (result.status !== "ok") return `not-ok:${result.status}`;
      return [...result.hand.handInput.closedTiles].sort().join("");
    };
    expect(signature(true)).toBe(signature(false));
  });

  it("never reports a planner defect on a generated hand", () => {
    // The tripwire from the telemetry design: drift and coverage-shadow are
    // expected, but a planner-defect means our own fu table or template is
    // wrong. It should never fire on hands we built ourselves.
    let defects = 0;
    for (let seed = 0; seed < 60; seed++) {
      generate(
        { fu: 40, closed: true },
        {
          seed,
          onAttempt: (record) => {
            if (record.diagnosis === "planner-defect") defects++;
          },
        },
      );
    }
    expect(defects).toBe(0);
  });

  const yakuSpecs: [string, GenerateSpec][] = [
    ["tanyao + pinfu", { yaku: ["tanyao", "pinfu"] }],
    ["tanyao + pinfu + sanshoku", { yaku: ["tanyao", "pinfu", "sanshoku"] }],
    ["pinfu + ittsuu", { yaku: ["pinfu", "ittsuu"] }],
    ["honitsu + pinfu", { yaku: ["honitsu", "pinfu"] }],
    ["chinitsu", { yaku: ["chinitsu"] }],
    ["toitoi + sanankou", { yaku: ["toitoi", "sanankou"] }],
    ["chun", { yaku: ["chun"] }],
    ["chiitoitsu + tanyao", { yaku: ["chiitoitsu", "tanyao"] }],
    ["suuankou", { yaku: ["suuankou"] }],
    ["iipeiko + pinfu", { yaku: ["iipeiko", "pinfu"] }],
  ];

  for (const [label, spec] of yakuSpecs) {
    it(`produces exactly the requested yaku: ${label}`, () => {
      const want = [...(spec.yaku ?? [])].sort().join("+");
      let produced = 0;
      for (let seed = 0; seed < 15; seed++) {
        const result = generate(spec, { seed });
        if (result.status !== "ok") continue;
        produced++;
        // Exclusivity holds across the whole tied-top set, not just index 0.
        const analysis = calculate(result.hand.handInput);
        const best = analysis.handInterpretations[0].basicPoints;
        for (const hi of analysis.handInterpretations) {
          if (hi.basicPoints !== best) continue;
          expect(
            hi.yaku
              .map((yaku) => yaku.name)
              .sort()
              .join("+"),
          ).toBe(want);
        }
      }
      expect(produced).toBeGreaterThan(10);
    });
  }

  it("proves yaku contradictions rather than searching for them", () => {
    const cases: [GenerateSpec, string][] = [
      // ittsuu needs 1-2-3 and 7-8-9 runs; both carry a terminal.
      [{ yaku: ["tanyao", "ittsuu"] }, "cannot occur"],
      [{ yaku: ["pinfu", "toitoi"] }, "cannot occur"],
      [{ yaku: ["pinfu"], openMeldCount: 1 }, "concealed"],
      [{ yaku: ["ippatsu"] }, "requires riichi"],
      // A concealed tsumo always carries menzen tsumo, so an exact list must say so.
      [
        { yaku: ["tanyao"], closed: true, winMethod: "tsumo" },
        "menzen-tsumo",
      ],
    ];
    for (const [spec, fragment] of cases) {
      const result = generate(spec, { seed: 1 });
      expect(result.status).toBe("unsatisfiable");
      if (result.status !== "unsatisfiable") continue;
      expect(result.reason).toContain(fragment);
    }
  });

  it("refuses yaku it cannot deliberately construct", () => {
    const result = generate({ yaku: ["daisangen"] }, { seed: 1 });
    expect(result.status).toBe("unsatisfiable");
    if (result.status !== "unsatisfiable") return;
    expect(result.reason).toContain("not requested");
  });

  it("does not call kokushi impossible", () => {
    // Same soundness bug as chiitoitsu: a shape missing from the model turns
    // into a false proof of impossibility.
    const result = generate({ handShape: "kokushi" }, { seed: 4 });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(
      result.hand.canonical.yaku.map((yaku) => yaku.name),
    ).toContain("kokushi-musou");
  });

  it("atLeast allows extra yaku that exact rejects", () => {
    let exactOk = 0;
    let atLeastOk = 0;
    for (let seed = 0; seed < 30; seed++) {
      if (generate({ yaku: ["pinfu"] }, { seed }).status === "ok") exactOk++;
      if (
        generate({ yaku: ["pinfu"], yakuPolicy: "atLeast" }, { seed }).status ===
        "ok"
      ) {
        atLeastOk++;
      }
    }
    expect(atLeastOk).toBeGreaterThanOrEqual(exactOk);
  });

  it("honours requireUnambiguousWait", () => {
    for (let seed = 0; seed < 25; seed++) {
      const result = generate(
        { fu: 40, waitType: "shanpon" },
        { seed, requireUnambiguousWait: true },
      );
      if (result.status !== "ok") continue;
      expect(result.hand.ambiguity.wait).toBe(false);
    }
  });
});
