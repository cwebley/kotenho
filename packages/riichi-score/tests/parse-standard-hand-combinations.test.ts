import { MahjongTile } from "../src/models/mahjong-tile";
import { parseStandardHandCombinations } from "../src/parsing/standard-hand-combinations";
import { interpretWaitsFromGroups } from "../src/parsing/interpret-waits-from-groups";
import { describe, it, expect } from "vitest";
import { HandInput } from "../src/models/hand-input";
import { createGameState } from "../src/models/game-state";

describe("parseStandardHandCombinations", () => {
  it("parses a 4 set hand with a tanki wait", () => {
    const parentHand: MahjongTile[] = [
      "1m",
      "1m",
      "2m",
      "2m",
      "2m",
      "6p",
      "6p",
      "6p",
      "9p",
      "9p",
      "9p",
      "7z",
      "7z",
      "7z",
    ];

    const testHandInput: HandInput = {
      closedTiles: parentHand,
      openMelds: [],
      winningTile: {
        tile: "1m",
        isTsumo: true,
      },
      gameState: createGameState(),
    };

    const waitlessHandInterpretations =
      parseStandardHandCombinations(parentHand);
    expect(waitlessHandInterpretations.length).toBe(1);
    const handInterpretations = interpretWaitsFromGroups(
      waitlessHandInterpretations,
      testHandInput,
    );
    expect(handInterpretations.length).toBe(1);
    expect(handInterpretations[0].waitType).toBe("tanki");
  });
  it("handles a shanpon wait", () => {
    const parentHand: MahjongTile[] = [
      "1m",
      "2m",
      "3m",
      "6p",
      "6p",
      "6p",
      "9p",
      "9p",
      "9p",
      "5s",
      "6s",
      "7s",
      "2z",
      "2z",
    ];
    const testHandInput: HandInput = {
      closedTiles: parentHand,
      openMelds: [],
      winningTile: {
        tile: "6p",
        isTsumo: true,
      },
      gameState: createGameState(),
    };

    const waitlessHandInterpretations =
      parseStandardHandCombinations(parentHand);
    expect(waitlessHandInterpretations.length).toBe(1);
    const handInterpretations = interpretWaitsFromGroups(
      waitlessHandInterpretations,
      testHandInput,
    );
    expect(handInterpretations.length).toBe(1);
    expect(handInterpretations[0].waitType).toBe("shanpon");
  });

  it("handles a kanchan wait", () => {
    const parentHand: MahjongTile[] = [
      "1m",
      "2m",
      "3m",
      "6p",
      "6p",
      "6p",
      "9p",
      "9p",
      "9p",
      "5s",
      "6s",
      "7s",
      "2z",
      "2z",
    ];
    const testHandInput: HandInput = {
      closedTiles: parentHand,
      openMelds: [],
      winningTile: {
        tile: "6s",
        isTsumo: true,
      },
      gameState: createGameState(),
    };

    const waitlessHandInterpretations =
      parseStandardHandCombinations(parentHand);
    expect(waitlessHandInterpretations.length).toBe(1);
    const handInterpretations = interpretWaitsFromGroups(
      waitlessHandInterpretations,
      testHandInput,
    );
    expect(handInterpretations.length).toBe(1);
    expect(handInterpretations[0].waitType).toBe("kanchan");
  });
  it("handles a penchan wait", () => {
    const parentHand: MahjongTile[] = [
      "1m",
      "2m",
      "3m",
      "6p",
      "6p",
      "6p",
      "9p",
      "9p",
      "9p",
      "5s",
      "6s",
      "7s",
      "2z",
      "2z",
    ];
    const testHandInput: HandInput = {
      closedTiles: parentHand,
      openMelds: [],
      winningTile: {
        tile: "3m",
        isTsumo: true,
      },
      gameState: createGameState(),
    };

    const waitlessHandInterpretations =
      parseStandardHandCombinations(parentHand);
    expect(waitlessHandInterpretations.length).toBe(1);
    const handInterpretations = interpretWaitsFromGroups(
      waitlessHandInterpretations,
      testHandInput,
    );
    expect(handInterpretations.length).toBe(1);
    expect(handInterpretations[0].waitType).toBe("penchan");
  });
  it("handles a ryanmen wait on the edge", () => {
    const parentHand: MahjongTile[] = [
      "1m",
      "2m",
      "3m",
      "6p",
      "6p",
      "6p",
      "9p",
      "9p",
      "9p",
      "5s",
      "6s",
      "7s",
      "2z",
      "2z",
    ];
    const testHandInput: HandInput = {
      closedTiles: parentHand,
      openMelds: [],
      winningTile: {
        tile: "1m",
        isTsumo: true,
      },
      gameState: createGameState(),
    };

    const waitlessHandInterpretations =
      parseStandardHandCombinations(parentHand);
    expect(waitlessHandInterpretations.length).toBe(1);
    const handInterpretations = interpretWaitsFromGroups(
      waitlessHandInterpretations,
      testHandInput,
    );
    expect(handInterpretations.length).toBe(1);
    expect(handInterpretations[0].waitType).toBe("ryanmen");
  });
  it("parses an ambiguous hand", () => {
    const parentHand: MahjongTile[] = [
      "1m",
      "1m",
      "1m",
      "2m",
      "2m",
      "2m",
      "3m",
      "3m",
      "3m",
      "4m",
      "4m",
      "4m",
      "5m",
      "5m",
    ];
    const testHandInput: HandInput = {
      closedTiles: parentHand,
      openMelds: [],
      winningTile: {
        tile: "5m",
        isTsumo: true,
      },
      gameState: createGameState(),
    };

    const waitlessHandInterpretations =
      parseStandardHandCombinations(parentHand);
    expect(waitlessHandInterpretations.length).toBe(4);
    const handInterpretations = interpretWaitsFromGroups(
      waitlessHandInterpretations,
      testHandInput,
    );
    expect(handInterpretations.length).toBe(5);
    expect(
      handInterpretations
        .map((interp) => interp.waitType)
        .filter((waitType) => waitType === "tanki").length,
    ).toBe(3);
    expect(
      handInterpretations
        .map((interp) => interp.waitType)
        .filter((waitType) => waitType === "ryanmen").length,
    ).toBe(2);
  });
});
