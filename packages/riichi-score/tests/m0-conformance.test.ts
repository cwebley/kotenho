import { describe, expect, it } from "vitest";
import { m0Fixtures } from "../../../internal/fixtures/curated/m0.mjs";
import { calculate, createGameState } from "../src/index.js";

describe("M0 curated scorer conformance", () => {
  for (const fixture of m0Fixtures) {
    it(fixture.name, () => {
      const result = calculate({
        ...fixture.handInput,
        gameState: createGameState(fixture.handInput.gameState),
      });

      expect(result.valid).toBe(true);
      expect(result.handInterpretations).not.toHaveLength(0);
      const interpretation = result.handInterpretations[0];
      expect(interpretation.rawFu).toBe(fixture.expected.rawFu);
      expect(interpretation.fu).toBe(fixture.expected.fu);
      expect(interpretation.han).toBe(fixture.expected.han);
      expect(interpretation.basicPoints).toBe(fixture.expected.basicPoints);
      expect(interpretation.yaku.map((yaku) => yaku.name).sort()).toEqual(
        [...fixture.expected.yaku].sort(),
      );
    });
  }

  it("counts ura dora only after riichi", () => {
    const input = {
      closedTiles: [
        "1m", "2m", "3m", "9p", "9p", "1s", "2s", "3s", "3s", "4s", "5s", "7s", "8s",
      ],
      winningTile: { tile: "9s", from: "north" } as const,
    };
    const withRiichi = calculate({
      ...input,
      gameState: createGameState({
        isRiichi: true,
        isIppatsu: true,
        uradoraIndicators: ["8s"],
      }),
    });
    const withoutRiichi = calculate({
      ...input,
      gameState: createGameState({ uradoraIndicators: ["8s"] }),
    });

    expect(withRiichi.handInterpretations[0].uradora).toBe(1);
    expect(withoutRiichi.handInterpretations[0].uradora).toBe(0);

    const withDoubleRiichi = calculate({
      ...input,
      gameState: createGameState({
        isDoubleRiichi: true,
        uradoraIndicators: ["8s"],
      }),
    });
    expect(withDoubleRiichi.handInterpretations[0].uradora).toBe(1);
    expect(withDoubleRiichi.handInterpretations[0].yaku.map((yaku) => yaku.name)).toContain("double-riichi");
  });

  it("emits haitei and houtei only for their matching win method", () => {
    const closedTiles = [
      "1m", "2m", "3m", "9p", "9p", "1s", "2s", "3s", "3s", "4s", "5s", "7s", "8s",
    ];
    const haitei = calculate({
      closedTiles,
      winningTile: { tile: "9s", isTsumo: true },
      gameState: createGameState({ isHaitei: true }),
    });
    const houtei = calculate({
      closedTiles,
      winningTile: { tile: "9s", from: "north" },
      gameState: createGameState({ isHoutei: true }),
    });
    const mismatched = calculate({
      closedTiles,
      winningTile: { tile: "9s", isTsumo: true },
      gameState: createGameState({ isHoutei: true }),
    });

    expect(haitei.handInterpretations[0].yaku.map((yaku) => yaku.name)).toContain("haitei");
    expect(houtei.handInterpretations[0].yaku.map((yaku) => yaku.name)).toContain("houtei");
    expect(mismatched.handInterpretations[0].yaku.map((yaku) => yaku.name)).not.toContain("houtei");
  });

  it("rejects hands containing more than four copies of a tile", () => {
    const result = calculate({
      closedTiles: [
        "2m", "2m", "2m", "2m", "1p", "2p", "3p", "4p", "5p", "6p", "7s", "8s", "9s",
      ],
      winningTile: { tile: "2m", from: "north" },
      gameState: createGameState(),
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("A tile appears more than four times: 2m (5).");
  });

  it("represents kokushi as a yakuman limit rather than 13 han", () => {
    const result = calculate({
      closedTiles: [
        "1m", "1m", "9m", "1p", "9p", "1s", "9s", "1z", "2z", "3z", "4z", "5z", "6z",
      ],
      winningTile: { tile: "7z", from: "north" },
      gameState: createGameState(),
    });

    const interpretation = result.handInterpretations[0];
    expect(interpretation.limit).toBe("yakuman");
    expect(interpretation.han).toBe(0);
    expect(interpretation.basicPoints).toBe(8000);
  });

  it("reports a yaku-less hand as invalid rather than valid-with-no-readings", () => {
    const result = calculate({
      closedTiles: ["2m", "3m", "4m", "5p", "6p", "7p", "7s", "8s", "8s", "8s"],
      openMelds: [{ type: "run", tiles: ["2m", "3m", "4m"], from: "east" }],
      winningTile: { tile: "9s", from: "north" },
      gameState: createGameState(),
    });

    expect(result.handInterpretations).toHaveLength(0);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("no yaku");
  });

  it("never parses honors as a run", () => {
    // 1z2z3z, 2z3z4z and 5z6z7z all look like sequences to a rank-incrementing
    // helper. Any interpretation containing one is a phantom.
    const result = calculate({
      closedTiles: [
        "2p", "3p", "3p", "4p", "4p", "5z", "5z", "6z", "6z", "7p", "7p", "7z", "7z",
      ],
      winningTile: { tile: "2p", from: "north" },
      gameState: createGameState(),
    });

    for (const interpretation of result.handInterpretations) {
      if (!interpretation.isStandardHand) continue;
      for (const group of interpretation.groups) {
        if (group.type !== "run") continue;
        expect(group.tiles.some((tile) => tile.endsWith("z"))).toBe(false);
      }
    }
  });

  it("rejects a run meld made of honors", () => {
    const result = calculate({
      closedTiles: ["1m", "2m", "3m", "4m", "5m", "6m", "7p", "8p", "9p", "5s"],
      openMelds: [{ type: "run", tiles: ["5z", "6z", "7z"], from: "east" }],
      winningTile: { tile: "5s", from: "north" },
      gameState: createGameState(),
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("Invalid meld"))).toBe(
      true,
    );
  });

  it("reports tiles that form no winning shape as invalid", () => {
    const result = calculate({
      closedTiles: [
        "1m", "3m", "5m", "7m", "9m", "1p", "3p", "5p", "7p", "9p", "1s", "3s", "5s",
      ],
      winningTile: { tile: "7s", from: "north" },
      gameState: createGameState(),
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("do not form a winning hand");
  });
});
