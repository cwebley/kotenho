import { describe, expect, it } from "vitest";
import { calculate } from "riichi-score";
import { generate } from "../src/generate.js";
import { normalizedHandSignature } from "../src/identity.js";
import { allSkeletons, selectSkeletons } from "../src/skeleton.js";
import type { GenerateSpec } from "../src/types.js";

const sortForDisplay = (tiles: string[]): string[] => {
  const suits = { m: 0, p: 1, s: 2, z: 3 } as const;
  return [...tiles].sort((a, b) => {
    const suitDiff = suits[a[1] as keyof typeof suits] - suits[b[1] as keyof typeof suits];
    if (suitDiff) return suitDiff;
    const rawA = Number(a[0]);
    const rawB = Number(b[0]);
    return (rawA || 5) - (rawB || 5) || rawA - rawB;
  });
};

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
    ["50 fu with one kan", { fu: 50, kanCount: 1, doraIndicatorCount: 2 }],
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

  it("returns generated tile arrays in display order", () => {
    const result = generate(
      { fu: 40, openMeldCount: 1 },
      { seed: 7, budget: 3000 },
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const input = result.hand.handInput;
    expect(input.closedTiles).toEqual(sortForDisplay(input.closedTiles));
    for (const meld of input.openMelds ?? []) {
      expect(meld.tiles).toEqual(sortForDisplay(meld.tiles));
    }
  });

  it("defaults round winds to East and South", () => {
    const rounds = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const result = generate(
        { fu: 30, closed: true, winMethod: "ron" },
        { seed },
      );
      expect(result.status).toBe("ok");
      if (result.status === "ok") {
        rounds.add(result.hand.handInput.gameState.roundWind);
      }
    }
    expect(rounds).toEqual(new Set(["east", "south"]));
  });

  it("chooses winds from explicit allowed lists", () => {
    const result = generate(
      {
        fu: 30,
        closed: true,
        winMethod: "ron",
        roundWind: ["west"],
        seatWind: ["south", "west", "north"],
      },
      { seed: 7 },
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const state = result.hand.handInput.gameState;
    expect(state.roundWind).toBe("west");
    expect(["south", "west", "north"]).toContain(state.seatWind);
  });

  it("rejects empty wind constraints", () => {
    const result = generate({ roundWind: [] });
    expect(result.status).toBe("unsatisfiable");
    if (result.status !== "unsatisfiable") return;
    expect(result.reason).toContain("roundWind");
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
    ["chanta", { yaku: ["chanta"] }],
    ["junchan", { yaku: ["junchan"] }],
    ["chanta + sanshoku", { yaku: ["chanta", "sanshoku"] }],
    ["chanta + haku", { yaku: ["chanta", "haku"] }],
    ["junchan + chinitsu", { yaku: ["junchan", "chinitsu"] }],
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

  it("propagates rulesets and proves open tanyao unavailable when kuitan is off", () => {
    const unavailable = generate({
      yaku: ["tanyao"],
      closed: false,
      ruleset: { openTanyao: false },
    });
    expect(unavailable.status).toBe("unsatisfiable");
    if (unavailable.status === "unsatisfiable") {
      expect(unavailable.reason).toContain("disabled for open hands");
    }

    const result = generate(
      { yaku: ["tanyao"], ruleset: { kiriageMangan: true } },
      { seed: 7 },
    );
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.hand.handInput.gameState.ruleset?.kiriageMangan).toBe(true);
    }
  });

  it("refuses yaku it cannot deliberately construct", () => {
    const result = generate({ yaku: ["daisangen"] }, { seed: 1 });
    expect(result.status).toBe("unsatisfiable");
    if (result.status !== "unsatisfiable") return;
    expect(result.reason).toContain("not requested");
  });

  it("covers both honor-pair and honor-group chanta constructions", () => {
    let honorPair = false;
    let honorGroup = false;
    for (let seed = 0; seed < 100 && (!honorPair || !honorGroup); seed++) {
      const result = generate({ yaku: ["chanta"] }, { seed, budget: 3000 });
      expect(result.status).toBe("ok");
      if (result.status !== "ok" || !result.hand.canonical.isStandardHand) continue;
      const { canonical } = result.hand;
      const pair = canonical.pair.tiles[0];
      honorPair ||= pair.endsWith("z");
      honorGroup ||= canonical.groups.some((group) => group.tiles[0].endsWith("z"));

      const groups = [canonical.pair.tiles, ...canonical.groups.map((group) => group.tiles)];
      expect(
        groups.every((tiles) =>
          tiles.some((tile) => tile.endsWith("z") || tile[0] === "1" || tile[0] === "9"),
        ),
      ).toBe(true);
      for (const group of canonical.groups.filter((group) => group.type === "run")) {
        expect(["1", "7"]).toContain(group.tiles[0][0]);
      }
    }
    expect(honorPair).toBe(true);
    expect(honorGroup).toBe(true);
  });

  it("varies how many chanta groups are honors", () => {
    // A chanta hand can hold honors in its pair and in any triplet/kan, so the
    // count should move. Pinning it to the minimum of one was the old placer's
    // doing; honors are now sampled per block and only the "at least one" rule
    // is enforced, by rejection.
    const counts = new Map<number, number>();
    for (let seed = 0; seed < 60; seed++) {
      const result = generate({ yaku: ["chanta"] }, { seed, budget: 3000 });
      expect(result.status).toBe("ok");
      if (result.status !== "ok" || !result.hand.canonical.isStandardHand) continue;
      const { canonical } = result.hand;
      // Honors can only sit in the pair or a triplet/kan, never in a run, so
      // distinct honor tile types is exactly the number of honor groups.
      const honors = new Set(
        [canonical.pair.tiles, ...canonical.groups.map((group) => group.tiles)]
          .flat()
          .filter((tile) => tile.endsWith("z")),
      );
      expect(honors.size).toBeGreaterThan(0);
      counts.set(honors.size, (counts.get(honors.size) ?? 0) + 1);
    }
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
    const multi = [...counts.entries()]
      .filter(([size]) => size >= 2)
      .reduce((sum, [, n]) => sum + n, 0);
    expect(counts.get(1) ?? 0).toBeGreaterThan(0);
    expect(multi / total).toBeGreaterThan(0.2);
  });

  it("never emits a malformed forced honor group", () => {
    // Building an honor triplet by picking each tile independently produced
    // groups like 1z 2z 4z, which the scorer correctly rejected as an invalid
    // hand — it was 43% of all rejections on a chanta batch.
    const result = generate({ yaku: ["chanta"] }, { count: 10, seed: 7, budget: 1000 });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.rejections["invalid-hand"] ?? 0).toBe(0);
  });

  it("prices dora against the hand's own open/closed han", () => {
    // chanta is 2 han closed and 1 open. Charging every skeleton the closed
    // price made "chanta, 3 han" ask for one dora, which no open skeleton could
    // reach — and open skeletons are most of the chanta space.
    const result = generate({ yaku: ["chanta"], han: 3 }, { count: 10, seed: 7, budget: 1000 });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.hands).toHaveLength(10);
    expect(result.attempts).toBeLessThan(200);
    for (const hand of result.hands) expect(hand.canonical.han).toBe(3);
  });

  it("allocates exact aka dora inside the physical five-tile budget", () => {
    const result = generate(
      { yaku: ["tanyao"], han: 3, dora: 1, akaDora: 1 },
      { count: 10, seed: 7, budget: 3000 },
    );
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      for (const hand of result.hands) {
        const input = hand.handInput;
        const tiles = [
          ...input.closedTiles,
          input.winningTile.tile,
          ...(input.openMelds ?? []).flatMap((meld) => meld.tiles),
        ];
        expect(tiles.filter((tile) => tile[0] === "0")).toHaveLength(1);
        expect(hand.canonical.akadora).toBe(1);
        expect(hand.canonical.dora).toBe(1);
        expect(hand.canonical.han).toBe(3);
      }
    }

    expect(
      generate({ yaku: ["tanyao"], akaDora: 1, ruleset: { akaDora: { manzu: 0, pinzu: 0, souzu: 0 } } }).status,
    ).toBe("unsatisfiable");
    expect(generate({ yaku: ["tanyao"], akaDora: 4 }).status).toBe("unsatisfiable");
  });

  it("varies inferred bonus han between omote and aka dora", () => {
    const result = generate(
      { yaku: ["tanyao"], han: 2 },
      { count: 20, seed: 7, budget: 3000 },
    );
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      const sources = new Set(
        result.hands.map(({ canonical }) => `${canonical.dora}/${canonical.akadora}`),
      );
      expect(sources).toContain("1/0");
      expect(sources).toContain("0/1");
      for (const hand of result.hands) expect(hand.canonical.han).toBe(2);
    }

    const omoteOnly = generate(
      { yaku: ["tanyao"], han: 2, dora: 1 },
      { count: 5, seed: 7, budget: 3000 },
    );
    expect(omoteOnly.status).toBe("ok");
    if (omoteOnly.status === "ok") {
      for (const hand of omoteOnly.hands) {
        expect(hand.canonical.dora).toBe(1);
        expect(hand.canonical.akadora).toBe(0);
      }
    }
  });

  it("uses ura dora as an inferred bonus source after riichi", () => {
    const result = generate(
      { yaku: ["riichi", "tanyao"], han: 3 },
      { count: 30, seed: 7, budget: 5000 },
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const sources = new Set(
      result.hands.map(
        ({ canonical }) => `${canonical.dora}/${canonical.uradora}/${canonical.akadora}`,
      ),
    );
    expect(sources).toContain("1/0/0");
    expect(sources).toContain("0/1/0");
    expect(sources).toContain("0/0/1");
  });

  it("keeps junchan honor-free and rejects terminal-family contradictions", () => {
    for (let seed = 0; seed < 20; seed++) {
      const result = generate({ yaku: ["junchan"] }, { seed, budget: 3000 });
      expect(result.status).toBe("ok");
      if (result.status !== "ok") continue;
      const input = result.hand.handInput;
      const tiles = [
        ...input.closedTiles,
        input.winningTile.tile,
        ...(input.openMelds ?? []).flatMap((meld) => meld.tiles),
      ];
      expect(tiles.some((tile) => tile.endsWith("z"))).toBe(false);
    }

    for (const spec of [
      { yaku: ["chanta", "ittsuu"] },
      { yaku: ["chanta", "toitoi"] },
      { yaku: ["junchan", "haku"] },
      { yaku: ["junchan", "honitsu"] },
    ] as GenerateSpec[]) {
      expect(generate(spec).status).toBe("unsatisfiable");
    }
  });

  it("uses the correct open and closed terminal-family han", () => {
    for (const [name, closedHan, openHan] of [
      ["chanta", 2, 1],
      ["junchan", 3, 2],
    ] as const) {
      const closed = generate({ yaku: [name], closed: true }, { seed: 7, budget: 3000 });
      const open = generate({ yaku: [name], closed: false }, { seed: 7, budget: 3000 });
      expect(closed.status).toBe("ok");
      expect(open.status).toBe("ok");
      if (closed.status === "ok") {
        expect(closed.hand.canonical.yaku).toEqual([{ name, han: closedHan }]);
      }
      if (open.status === "ok") {
        expect(open.hand.canonical.yaku).toEqual([{ name, han: openHan }]);
      }
    }
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

  it("models declared yaku through game state", () => {
    const cases = [
      ["haitei", { isHaitei: true }, true],
      ["houtei", { isHoutei: true }, false],
      ["riichi", { isRiichi: true }, undefined],
      ["double-riichi", { isDoubleRiichi: true }, undefined],
    ] as const;

    for (const [name, flags, tsumo] of cases) {
      const result = generate({ yaku: [name] }, { seed: 7, budget: 3000 });
      expect(result.status).toBe("ok");
      if (result.status !== "ok") continue;
      const state = result.hand.handInput.gameState;
      expect(state).toMatchObject(flags);
      if (tsumo !== undefined) {
        expect(Boolean(result.hand.handInput.winningTile.isTsumo)).toBe(tsumo);
      }
      expect(result.hand.canonical.yaku.map((yaku) => yaku.name)).toEqual([name]);
    }
  });

  it("reveals matching ura indicators for riichi", () => {
    const result = generate(
      { yaku: ["riichi"], doraIndicatorCount: 3 },
      { seed: 7, budget: 3000 },
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const state = result.hand.handInput.gameState;
    expect(state.doraIndicators).toHaveLength(3);
    expect(state.uradoraIndicators).toHaveLength(3);
  });

  it("requires enough visible indicators for kans in the winner's hand", () => {
    expect(generate({ doraIndicatorCount: 0 }).status).toBe("unsatisfiable");
    expect(generate({ doraIndicatorCount: 6 }).status).toBe("unsatisfiable");
    expect(generate({ kanCount: 1 }).status).toBe("unsatisfiable");
    expect(generate({ kanCount: 2, doraIndicatorCount: 2 }).status).toBe(
      "unsatisfiable",
    );
    expect(
      generate({ kanCount: 1, doraIndicatorCount: 2 }, { seed: 7, budget: 3000 })
        .status,
    ).toBe("ok");
    expect(
      generate({ kanCount: 0, doraIndicatorCount: 4 }, { seed: 7, budget: 3000 })
        .status,
    ).toBe("ok");
  });

  it("requires riichi alongside ippatsu", () => {
    expect(generate({ yaku: ["ippatsu"] }).status).toBe("unsatisfiable");
    const result = generate(
      { yaku: ["riichi", "ippatsu"] },
      { seed: 7, budget: 3000 },
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.hand.handInput.gameState.isIppatsu).toBe(true);
    expect(result.hand.canonical.yaku.map((yaku) => yaku.name).sort()).toEqual([
      "ippatsu",
      "riichi",
    ]);
  });
});

describe("dora", () => {
  it("reaches an exact han target by placing dora", () => {
    // The dora needed depends on the hand, not the spec: most yaku are worth a
    // han less open, so an open chinitsu closes the gap to 8 with three dora
    // where a closed one needs two.
    for (const [spec, closedBonus, openBonus] of [
      [{ yaku: ["tanyao"], han: 3 } as GenerateSpec, 2, 2],
      [{ yaku: ["pinfu"], han: 4 } as GenerateSpec, 3, 3],
      [{ yaku: ["chinitsu"], han: 8 } as GenerateSpec, 2, 3],
    ] as const) {
      let result = generate(spec, { seed: 0, budget: 3000 });
      for (let seed = 1; result.status !== "ok" && seed < 30; seed++) {
        result = generate(spec, { seed, budget: 3000 });
      }
      expect(result.status).toBe("ok");
      if (result.status !== "ok") continue;
      const { canonical } = result.hand;
      const menzen =
        canonical.isStandardHand !== true ||
        canonical.groups.every((group) => !group.open);
      expect(canonical.han).toBe(spec.han);
      expect(canonical.dora + canonical.uradora + canonical.akadora).toBe(
        menzen ? closedBonus : openBonus,
      );
    }
  });

  it("counts indicators against the four-copy limit", () => {
    // Indicators are physical tiles: hand + omote + kan dora + ura all draw
    // from the same 136.
    for (let seed = 0; seed < 40; seed++) {
      const result = generate(
        { dora: 2, doraIndicatorCount: 2 },
        { seed, budget: 2000 },
      );
      if (result.status !== "ok") continue;
      const input = result.hand.handInput;
      const counts = new Map<string, number>();
      for (const tile of [
        ...input.closedTiles,
        input.winningTile.tile,
        ...(input.openMelds ?? []).flatMap((meld) => meld.tiles),
        ...(input.gameState?.doraIndicators ?? []),
        ...(input.gameState?.uradoraIndicators ?? []),
      ]) {
        counts.set(tile, (counts.get(tile) ?? 0) + 1);
      }
      for (const [, n] of counts) expect(n).toBeLessThanOrEqual(4);
    }
  });

  it("proves dora reachability from the shape", () => {
    // Every tile in a chiitoitsu hand appears exactly twice, so an indicator
    // yields 0 or 2 and an odd total cannot happen at any number of indicators.
    for (const slots of [1, 2, 3]) {
      const odd = generate(
        { handShape: "chiitoitsu", dora: 1, doraIndicatorCount: slots },
        { seed: 1 },
      );
      expect(odd.status).toBe("unsatisfiable");
    }
    // All triplets and a pair: no tile appears exactly once.
    expect(generate({ yaku: ["toitoi"], dora: 1 }, { seed: 1 }).status).toBe(
      "unsatisfiable",
    );
    // But runs stack, so three overlapping runs can supply three of one tile.
    expect(generate({ yaku: ["pinfu"], han: 4 }, { seed: 9, budget: 3000 }).status).toBe("ok");
    // A pair can combine with overlapping runs, reaching four copies without a
    // kan; a block-local maximum would wrongly prove this impossible.
    expect(
      generate(
        { yaku: ["iipeiko"], waitType: "shanpon", han: 5 },
        { seed: 9, budget: 3000 },
      ).status,
    ).not.toBe("unsatisfiable");
  });

  it("requires riichi for ura dora", () => {
    const result = generate({ uraDora: 1 }, { seed: 1 });
    expect(result.status).toBe("unsatisfiable");
    if (result.status !== "unsatisfiable") return;
    expect(result.reason).toContain("riichi");
  });

  it("proves han targets below the yaku total impossible", () => {
    const result = generate({ yaku: ["chinitsu"], han: 2 }, { seed: 1 });
    expect(result.status).toBe("unsatisfiable");
    if (result.status !== "unsatisfiable") return;
    expect(result.reason).toContain("at least");
  });
});

describe("batch generation", () => {
  it("returns deterministic, materially distinct hands", () => {
    const options = { count: 10, seed: 31, budget: 1000 };
    const first = generate({ fu: 30, closed: true, winMethod: "ron" }, options);
    const second = generate({ fu: 30, closed: true, winMethod: "ron" }, options);

    expect(first.status).toBe("ok");
    expect(second.status).toBe("ok");
    if (first.status !== "ok" || second.status !== "ok") return;
    expect(first.requested).toBe(10);
    expect(first.hands.map((hand) => normalizedHandSignature(hand.handInput))).toEqual(
      second.hands.map((hand) => normalizedHandSignature(hand.handInput)),
    );
    expect(
      new Set(first.hands.map((hand) => normalizedHandSignature(hand.handInput))).size,
    ).toBe(10);
  });

  it("returns the distinct hands it found as a shortfall", () => {
    const result = generate(
      { handShape: "chiitoitsu" },
      { count: 2, seed: 7, budget: 1 },
    );

    expect(result.status).toBe("shortfall");
    if (result.status !== "shortfall") return;
    expect(result.hands).toHaveLength(1);
    expect(result.reason).toContain("1 distinct hand");
  });

  it("keeps static impossibility distinct from an exhausted batch", () => {
    const result = generate(
      { yaku: ["pinfu"], openMeldCount: 1 },
      { count: 3, seed: 1 },
    );

    expect(result).toMatchObject({
      status: "unsatisfiable",
      requested: 3,
    });

    const exhausted = generate(
      { fu: 40, closed: true, winMethod: "ron" },
      { count: 1, seed: 0, budget: 1 },
    );
    expect(exhausted).toMatchObject({ status: "exhausted", requested: 1 });
  });

  it("rejects invalid batch counts", () => {
    expect(() => generate({}, { count: 0 })).toThrow(
      "count must be a positive integer",
    );
    expect(() => generate({}, { count: 1.5 })).toThrow(
      "count must be a positive integer",
    );
  });
});

describe("static soundness", () => {
  /**
   * An "unsatisfiable" verdict is a proof, and nothing downstream can correct
   * it — the engine returns before a hand exists. Three surfaces can produce
   * one (incompatibility table, shape exclusion, dora reachability) and each
   * has had a real bug. This challenges every claim: prove it by searching.
   */
  it("never claims impossible a spec the search can satisfy", () => {
    const specs: GenerateSpec[] = [
      // Fired wrongly when no yaku list was given at all.
      { closed: true, winMethod: "tsumo" },
      { fu: 40, closed: true, winMethod: "tsumo" },
      { fu: 30, winMethod: "tsumo", openMeldCount: 0 },
      // Four called kans is still suukantsu.
       { yaku: ["suukantsu"], closed: false, doraIndicatorCount: 5 },
      // Runs stack: 234m/345m/456m puts three 4m in an all-runs hand.
      { yaku: ["pinfu"], han: 4 },
      { fu: 25 },
      { handShape: "kokushi" },
    ];
    for (const spec of specs) {
      const result = generate(spec, { seed: 5, budget: 3000 });
      expect(result.status).not.toBe("unsatisfiable");
    }
  });

  it("still refuses the genuinely impossible", () => {
    // Four CONCEALED triplets cannot include a called one.
    expect(generate({ yaku: ["suuankou"], closed: false }).status).toBe(
      "unsatisfiable",
    );
    expect(generate({ yaku: ["pinfu"], openMeldCount: 1 }).status).toBe(
      "unsatisfiable",
    );
    expect(
      generate({ handShape: "chiitoitsu", dora: 1 }).status,
    ).toBe("unsatisfiable");
  });
});
