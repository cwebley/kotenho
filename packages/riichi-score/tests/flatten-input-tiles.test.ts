import { createGameState } from "../src/models/game-state";
import { describe, expect, it } from "vitest";
import { flattenInputTiles } from "../src/models/hand-input";
import { MahjongTile } from "../src/models/mahjong-tile";

describe("flattenInputTiles", () => {
  it("returns 14 tiles from a non standard hand", () => {
    const closedTiles: MahjongTile[] = [
      "1m",
      "1m",
      "3m",
      "3m",
      "4p",
      "9p",
      "9p",
      "5s",
      "5s",
      "1z",
      "1z",
      "6z",
      "6z",
    ];
    const testHand = {
      closedTiles,
      openMelds: [],
      winningTile: { tile: "4p" as MahjongTile },
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    };

    const flattened = flattenInputTiles(testHand);
    expect(flattened.length).toBe(14);
  });
});
