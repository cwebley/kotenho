import { createGameState } from "../src/models/game-state";
import { createHandInterpretation } from "../src/models/hand-interpretation";
import { createPinfuListing } from "../src/yaku/pinfu";
import { createStandardPair } from "../src/models/standard-pair";
import { createStandardGroup } from "../src/models/standard-group";
import { describe, expect, it } from "vitest";
import { createChiitoiListing } from "../src/yaku/chiitoi";
import { flattenTiles } from "../src/utils/flatten-tiles.ts";

describe("flattenTiles", () => {
  it("returns 14 tiles from a non standard hand", () => {
    const testHand = createHandInterpretation({
      isStandardHand: false,
      waitType: "tanki",
      winningTile: {
        tile: "4p",
        from: "north",
      },
      tiles: [
        "1m",
        "1m",
        "3m",
        "3m",
        "4p",
        "4p",
        "9p",
        "9p",
        "5s",
        "5s",
        "1z",
        "1z",
        "6z",
        "6z",
      ],
      yaku: [createChiitoiListing()],
      fuList: [],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const flattened = flattenTiles(testHand);
    expect(flattened.length).toBe(14);
  });

  it("returns tiles from a standard hand by reading the pair and the groups", () => {
    const testHand = createHandInterpretation({
      isStandardHand: true,
      waitType: "ryanmen",
      winningTile: {
        tile: "2p",
        isTsumo: true,
      },
      yaku: [createPinfuListing()],
      fuList: [],
      pair: createStandardPair({
        tiles: ["4p", "4p"],
      }),
      groups: [
        createStandardGroup({
          tiles: ["1m", "2m", "3m"],
          type: "run",
          open: false,
        }),
        createStandardGroup({
          tiles: ["5p", "6p", "7p"],
          type: "run",
          open: false,
          isFinalWait: true,
        }),
        createStandardGroup({
          tiles: ["7p", "8p", "9p"],
          type: "run",
          open: false,
        }),
        createStandardGroup({
          tiles: ["3s", "4s", "5s"],
          type: "run",
          open: true,
        }),
      ],
      gameState: createGameState({
        roundWind: "east",
        seatWind: "south",
      }),
    });

    const flattened = flattenTiles(testHand);
    expect(flattened.length).toBe(14);
    expect(flattened).toContain("4p");
    expect(flattened).toContain("1m");
    expect(flattened).toContain("7p");
    expect(flattened).toContain("9p");
    expect(flattened).toContain("4s");
  });
});
