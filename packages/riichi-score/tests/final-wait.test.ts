import { describe, expect, it } from "vitest";
import { calculate, createGameState } from "../src/index.js";

describe("final wait", () => {
  it("reports a chiitoitsu wait", () => {
    const analysis = calculate({
      closedTiles: [
        "1m",
        "1m",
        "2m",
        "2m",
        "3p",
        "3p",
        "4p",
        "4p",
        "5s",
        "5s",
        "6z",
        "6z",
        "7z",
      ],
      openMelds: [],
      winningTile: { tile: "7z", isTsumo: true },
      gameState: createGameState(),
    });

    expect(analysis.finalWait).toEqual({
      tiles: ["7z"],
      sideCount: 1,
    });
  });

  it("reports all thirteen kokushi wait types", () => {
    const analysis = calculate({
      closedTiles: [
        "1m",
        "9m",
        "1p",
        "9p",
        "1s",
        "9s",
        "1z",
        "2z",
        "3z",
        "4z",
        "5z",
        "6z",
        "7z",
      ],
      openMelds: [],
      winningTile: { tile: "1m", isTsumo: true },
      gameState: createGameState(),
    });

    expect(analysis.finalWait).toEqual({
      tiles: [
        "1m",
        "9m",
        "1p",
        "9p",
        "1s",
        "9s",
        "1z",
        "2z",
        "3z",
        "4z",
        "5z",
        "6z",
        "7z",
      ],
      sideCount: 13,
    });
  });

  it("reports a structural wait even when the completion has no yaku", () => {
    const analysis = calculate({
      closedTiles: ["2p", "3p", "4p", "5p", "6p", "7p", "8s", "9s", "5z", "5z"],
      openMelds: [{ type: "run", tiles: ["1m", "2m", "3m"], from: "east" }],
      winningTile: { tile: "7s", isTsumo: true },
      gameState: createGameState(),
    });

    expect(analysis.valid).toBe(false);
    expect(analysis.finalWait).toEqual({
      tiles: ["7s"],
      sideCount: 1,
    });
  });
});
