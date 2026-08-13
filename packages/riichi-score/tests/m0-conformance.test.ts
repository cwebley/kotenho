import { describe, expect, it } from "vitest";
import { calculate, createGameState } from "../src/index.js";
import { HandInput } from "../src/models/hand-input.js";
import {
  allInterpretations,
  score,
} from "../../../internal/reference-scorer/src/index.mjs";

function yakuNames(hand: ReturnType<typeof calculate>): string[] {
  return hand.handInterpretations[0].yaku.map((yaku) => yaku.name);
}

describe("M0 scorer conformance", () => {
  it("scores ankan as concealed for fu and menzen tsumo", () => {
    const result = calculate({
      closedTiles: [
        "1m", "2m", "3m", "4m", "5m", "6m", "7p", "8p", "5s", "5s",
      ],
      openMelds: [
        { type: "ankan", tiles: ["7z", "7z", "7z", "7z"], from: "east" },
      ],
      winningTile: { tile: "9p", isTsumo: true },
      gameState: createGameState(),
    });

    const interpretation = result.handInterpretations[0];
    expect(yakuNames(result)).toContain("menzen-tsumo");
    expect(interpretation.fuList).toContainEqual({
      reason: "closed kan of terminals/honors",
      value: 32,
    });
  });

  it("applies the kuipinfu 30-fu floor", () => {
    const result = calculate({
      closedTiles: [
        "3p", "4p", "5p", "4p", "5p", "6p", "4s", "5s", "5s", "5s",
      ],
      openMelds: [{ type: "run", tiles: ["2m", "3m", "4m"], from: "east" }],
      winningTile: { tile: "6s", from: "north" },
      gameState: createGameState(),
    });

    expect(result.handInterpretations[0].rawFu).toBe(20);
    expect(result.handInterpretations[0].fu).toBe(30);
  });

  it("scores riichi, ippatsu, and riichi-gated ura dora", () => {
    const input: HandInput = {
      closedTiles: [
        "1m", "2m", "3m", "9p", "9p", "1s", "2s", "3s", "3s", "4s", "5s", "7s", "8s",
      ],
      winningTile: { tile: "9s", from: "north" },
      gameState: createGameState({
        isRiichi: true,
        isIppatsu: true,
        uradoraIndicators: ["8s"],
      }),
    };

    const result = calculate(input);
    expect(yakuNames(result)).toEqual(expect.arrayContaining(["riichi", "ippatsu", "pinfu"]));
    expect(result.handInterpretations[0].uradora).toBe(1);

    input.gameState = createGameState({ uradoraIndicators: ["8s"] });
    const withoutRiichi = calculate(input);
    expect(withoutRiichi.handInterpretations[0].uradora).toBe(0);
  });

  it("matches the independent scorer on a shared closed-hand corpus", () => {
    const fixtures = [
      {
        tiles: ["1m", "2m", "3m", "9p", "9p", "1s", "2s", "3s", "3s", "4s", "5s", "7s", "8s", "9s"],
        winningTile: "9s",
        tsumo: false,
      },
      {
        tiles: ["2m", "3m", "4m", "3p", "4p", "5p", "5p", "5p", "4s", "5s", "6s", "6s", "7s", "8s"],
        winningTile: "8s",
        tsumo: true,
      },
    ];

    for (const fixture of fixtures) {
      const result = calculate({
        closedTiles: fixture.tiles.slice(0, -1),
        winningTile: fixture.tsumo
          ? { tile: fixture.winningTile, isTsumo: true }
          : { tile: fixture.winningTile, from: "north" },
        gameState: createGameState(),
      });
      // The reference enumerates its own readings; use it to independently
      // verify the winning score, not riichi-score's grouping internals.
      const referenceScores = allInterpretations(
        fixture.tiles,
        fixture.winningTile,
      )
        .map((reading) =>
          score(reading, {
            open: false,
            tsumo: fixture.tsumo,
            roundWind: "1z",
            seatWind: "2z",
            dora: 0,
          }),
        )
        .filter((entry) => entry.points >= 0);
      expect(result.handInterpretations[0].basicPoints).toBe(
        Math.max(...referenceScores.map((entry) => entry.points)),
      );
    }
  });
});
