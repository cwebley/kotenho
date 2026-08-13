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
