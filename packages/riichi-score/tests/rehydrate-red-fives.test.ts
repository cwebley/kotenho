import { MahjongTile } from "../src/models/mahjong-tile";
import {
  createHandInterpretation,
  HandInterpretation,
} from "../src/models/hand-interpretation";
import { rehydrateRedFives } from "../src/utils/rehydrate-red-fives";
import { describe, it, expect } from "vitest";
import { createStandardPair } from "../src/models/standard-pair";
import { createStandardGroup } from "../src/models/standard-group";
import { createGameState } from "../src/models/game-state";

describe("rehydrateRedFives", () => {
  it("rehyrdates a red five as part of the pair", () => {
    const redFives: MahjongTile[] = ["0m"];
    const testHandInterpretation: HandInterpretation = createHandInterpretation(
      {
        isStandardHand: true,
        waitType: "penchan",
        pair: createStandardPair({
          tiles: ["5m", "5m"],
        }),
        groups: [
          createStandardGroup({
            tiles: ["1p", "2p", "3p"],
            type: "run",
            open: false,
            isFinalWait: true,
          }),
        ],
        winningTile: {
          tile: "3p",
          isTsumo: true,
        },
        gameState: createGameState(),
      },
    );

    const rehyratedHand = rehydrateRedFives(redFives, testHandInterpretation);
    expect(rehyratedHand.isStandardHand).toBe(true);
    if (rehyratedHand.isStandardHand) {
      expect(rehyratedHand.pair.tiles[0]).toBe("0m");
      expect(rehyratedHand.pair.tiles[1]).toBe("5m");
    }
  });
  it("rehyrdates a red five as part of a group", () => {
    const redFives: MahjongTile[] = ["0p"];

    const testHandInterpretation: HandInterpretation = createHandInterpretation(
      {
        isStandardHand: true,
        waitType: "ryanmen",
        pair: createStandardPair({
          tiles: ["4m", "4m"],
        }),
        groups: [
          createStandardGroup({
            tiles: ["3p", "4p", "5p"],
            type: "run",
            open: false,
            isFinalWait: true,
          }),
          createStandardGroup({
            tiles: ["3p", "4p", "5p"],
            type: "run",
            open: false,
          }),
        ],
        winningTile: {
          tile: "3p",
          isTsumo: true,
        },
        gameState: createGameState(),
      },
    );

    const rehyratedHand = rehydrateRedFives(redFives, testHandInterpretation);
    expect(rehyratedHand.isStandardHand).toBe(true);
    if (rehyratedHand.isStandardHand) {
      expect(rehyratedHand.groups[0].tiles[2]).toBe("0p");
      expect(rehyratedHand.groups[1].tiles[2]).toBe("5p");
    }
  });

  it("rehyrdates 3 red fives", () => {
    const redFives: MahjongTile[] = ["0s", "0m", "0p"];

    const testHandInterpretation: HandInterpretation = createHandInterpretation(
      {
        isStandardHand: true,
        waitType: "shanpon",
        pair: createStandardPair({
          tiles: ["5m", "5m"],
        }),
        groups: [
          createStandardGroup({
            tiles: ["3p", "4p", "5p"],
            type: "run",
            open: false,
            isFinalWait: true,
          }),
          createStandardGroup({
            tiles: ["5s", "5s", "5s"],
            type: "set",
            open: false,
            isFinalWait: true,
          }),
        ],
        winningTile: {
          tile: "0s",
          isTsumo: true,
        },
        gameState: createGameState(),
      },
    );

    const rehyratedHand = rehydrateRedFives(redFives, testHandInterpretation);
    //console.dir(rehyratedHand, { depth: null });
    expect(rehyratedHand.isStandardHand).toBe(true);
    if (rehyratedHand.isStandardHand) {
      expect(rehyratedHand.pair.tiles[0]).toBe("0m");
      expect(rehyratedHand.pair.tiles[1]).toBe("5m");
      expect(rehyratedHand.groups[0].tiles[2]).toBe("0p");
      expect(rehyratedHand.groups[1].tiles[0]).toBe("0s");
      expect(rehyratedHand.groups[1].tiles[2]).toBe("5s");
    }
  });

  it("rehydrates a chiitoi hand", () => {
    const redFives: MahjongTile[] = ["0p", "0s"];
    const testHandInterpretation: HandInterpretation = createHandInterpretation(
      {
        isStandardHand: false,
        waitType: "tanki",
        tiles: [
          "1m",
          "1m",
          "2m",
          "2m",
          "9m",
          "9m",
          "5p",
          "5p",
          "9p",
          "9p",
          "5s",
          "5s",
          "7z",
          "7z",
        ],
        winningTile: {
          tile: "9m",
          isTsumo: true,
        },
        gameState: createGameState(),
      },
    );

    const rehyratedHand = rehydrateRedFives(redFives, testHandInterpretation);
    expect(rehyratedHand.isStandardHand).toBe(false);
    if (!rehyratedHand.isStandardHand) {
      expect(rehyratedHand.tiles).toContain("0p");
      expect(rehyratedHand.tiles).toContain("0s");
      expect(rehyratedHand.tiles).not.toContain("0m");
    }
  });
});
